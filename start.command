#!/bin/bash

# Prompt Optimizer 一键启动器
# 自动启动应用并在浏览器中打开

# 获取脚本所在目录
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# 确保 prompts 目录存在（打包时会排除实际内容）
if [ ! -d "prompts" ]; then
    mkdir -p "prompts"
fi

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 显示启动横幅
echo ""
echo "======================================"
echo "   Prompt Optimizer - 一键启动器"
echo "======================================"
echo ""

# 检查 Node.js 是否安装
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: 未检测到 Node.js${NC}"
        echo "请先安装 Node.js: https://nodejs.org/"
        echo "按任意键退出..."
        read -n 1
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ 检测到 Node.js: $NODE_VERSION${NC}"
}

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 1
    else
        return 0
    fi
}

# 查找可用端口
find_available_port() {
    local port=3000
    while ! check_port $port; do
        echo -e "${YELLOW}端口 $port 已被占用，尝试下一个...${NC}" >&2
        port=$((port + 1))
    done
    echo $port
}

# 启动服务器
start_server() {
    local port=$1
    
    echo -e "${GREEN}正在端口 $port 上启动服务器...${NC}"
    echo ""
    
    # 导出端口环境变量
    export PORT=$port
    
    # 检查是否为开发模式或生产模式
    if [ -d ".next/standalone" ]; then
        echo "以生产模式运行..."
        NODE_ENV=production node .next/standalone/server.js &
    else
        echo "以开发模式运行..."
        npm run dev &
    fi
    
    SERVER_PID=$!
    
    # 等待服务器启动
    echo -n "等待服务器就绪"
    for i in {1..30}; do
        if curl -s http://localhost:$port > /dev/null; then
            echo ""
            echo -e "${GREEN}✓ 服务器启动成功！${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
    done
    
    echo ""
    echo -e "${RED}服务器启动超时${NC}"
    return 1
}

# 打开浏览器
open_browser() {
    local port=$1
    local url="http://localhost:$port"
    
    echo -e "${GREEN}正在打开浏览器: $url${NC}"
    
    # macOS 打开默认浏览器
    open "$url"
}

# 清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}正在关闭服务器...${NC}"
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
        wait $SERVER_PID 2>/dev/null
    fi
    echo -e "${GREEN}服务器已关闭${NC}"
    echo "再见！"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# 主流程
main() {
    # 检查 Node.js
    check_node
    
    # 查找可用端口
    PORT=$(find_available_port)
    echo -e "${GREEN}使用端口: $PORT${NC}"
    
    # 检查并安装依赖（如果需要）
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}未检测到依赖，正在安装...${NC}"
        npm install
        if [ $? -ne 0 ]; then
            echo -e "${RED}依赖安装失败${NC}"
            echo "按任意键退出..."
            read -n 1
            exit 1
        fi
    fi
    
    # 创建 .env.local 文件（如果不存在）
    if [ ! -f ".env.local" ] && [ -f ".env.local.example" ]; then
        echo -e "${YELLOW}创建配置文件...${NC}"
        cp .env.local.example .env.local
    fi
    
    # 启动服务器
    if start_server $PORT; then
        # 打开浏览器
        sleep 1
        open_browser $PORT
        
        echo ""
        echo "======================================"
        echo -e "${GREEN}应用正在运行！${NC}"
        echo -e "访问地址: ${GREEN}http://localhost:$PORT${NC}"
        echo ""
        echo "按 Ctrl+C 停止服务器"
        echo "======================================"
        echo ""
        
        # 保持脚本运行
        wait $SERVER_PID
    else
        echo -e "${RED}启动失败${NC}"
        cleanup
    fi
}

# 运行主程序
main