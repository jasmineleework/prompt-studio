import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Debouncing Behavior', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500))
      
      expect(result.current).toBe('initial')
    })

    it('should return debounced value after delay', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      )

      expect(result.current).toBe('initial')

      // Update value
      rerender({ value: 'updated', delay: 500 })
      expect(result.current).toBe('initial') // Should still be initial

      // Advance time by less than delay
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(result.current).toBe('initial')

      // Advance time to complete delay
      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(result.current).toBe('updated')
    })

    it('should reset timer when value changes rapidly', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      )

      // First update
      rerender({ value: 'first', delay: 500 })
      
      // Advance time partially
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(result.current).toBe('initial')

      // Second update before first completes
      rerender({ value: 'second', delay: 500 })

      // Complete original delay time
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(result.current).toBe('second') // Should be second, not first
    })

    it('should handle delay change', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      )

      rerender({ value: 'updated', delay: 1000 })
      
      // Advance by original delay
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(result.current).toBe('initial') // Should not update yet

      // Advance by additional time to reach new delay
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(result.current).toBe('updated')
    })
  })

  describe('Type Safety', () => {
    it('should work with string values', () => {
      const { result } = renderHook(() => useDebounce('test', 300))
      expect(typeof result.current).toBe('string')
    })

    it('should work with number values', () => {
      const { result } = renderHook(() => useDebounce(42, 300))
      expect(typeof result.current).toBe('number')
    })

    it('should work with object values', () => {
      const obj = { name: 'test' }
      const { result } = renderHook(() => useDebounce(obj, 300))
      expect(result.current).toEqual(obj)
    })

    it('should work with array values', () => {
      const arr = ['a', 'b', 'c']
      const { result } = renderHook(() => useDebounce(arr, 300))
      expect(result.current).toEqual(arr)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero delay', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 0 } }
      )

      rerender({ value: 'updated', delay: 0 })
      
      act(() => {
        vi.runAllTimers()
      })
      
      expect(result.current).toBe('updated')
    })

    it('should handle undefined values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: undefined, delay: 300 } }
      )

      expect(result.current).toBeUndefined()

      rerender({ value: 'defined', delay: 300 })
      
      act(() => {
        vi.advanceTimersByTime(300)
      })
      
      expect(result.current).toBe('defined')
    })

    it('should handle null values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: null, delay: 300 } }
      )

      expect(result.current).toBeNull()

      rerender({ value: 'not null', delay: 300 })
      
      act(() => {
        vi.advanceTimersByTime(300)
      })
      
      expect(result.current).toBe('not null')
    })

    it('should cleanup timers on unmount', () => {
      const { unmount, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 1000 } }
      )

      rerender({ value: 'updated', delay: 1000 })
      
      // Unmount before timer completes
      unmount()
      
      // Advance time - should not cause any issues
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      
      // No assertion needed - test passes if no errors thrown
    })
  })

  describe('Performance', () => {
    it('should only create one timer per value change', () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      const { rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      )

      // Should create initial timer
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1)
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(0)

      // Update value - should clear old timer and create new one
      rerender({ value: 'updated', delay: 500 })
      expect(setTimeoutSpy).toHaveBeenCalledTimes(2)
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)

      setTimeoutSpy.mockRestore()
      clearTimeoutSpy.mockRestore()
    })

    it('should handle rapid consecutive updates efficiently', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'v0', delay: 500 } }
      )

      // Rapid updates
      const values = ['v1', 'v2', 'v3', 'v4', 'v5']
      values.forEach((value, index) => {
        rerender({ value, delay: 500 })
        act(() => {
          vi.advanceTimersByTime(100) // Less than delay
        })
      })

      expect(result.current).toBe('v0') // Should still be original

      // Complete the delay
      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(result.current).toBe('v5') // Should be last value
    })
  })
})