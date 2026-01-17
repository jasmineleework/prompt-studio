#!/bin/bash

# Prompt Optimizer - 首次安装脚本
# 检查环境并安装必要的依赖

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示横幅
echo ""
echo "======================================"
echo "   Prompt Optimizer - 安装向导"
echo "======================================"
echo ""

# 获取脚本所在目录
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# 检查 Node.js
check_node() {
    echo -e "${BLUE}正在检查 Node.js...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ 未安装 Node.js${NC}"
        echo ""
        echo "Node.js 是运行此应用的必要组件。"
        echo ""
        echo "请选择安装方式："
        echo "1) 访问官网下载安装（推荐）"
        echo "2) 使用 Homebrew 安装（需要 Homebrew）"
        echo "3) 稍后自行安装"
        echo ""
        read -p "请选择 (1-3): " choice
        
        case $choice in
            1)
                echo "正在打开 Node.js 官网..."
                open "https://nodejs.org/"
                echo ""
                echo "请下载并安装 Node.js，然后重新运行此脚本。"
                exit 0
                ;;
            2)
                if command -v brew &> /dev/null; then
                    echo "正在使用 Homebrew 安装 Node.js..."
                    brew install node
                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}✓ Node.js 安装成功！${NC}"
                    else
                        echo -e "${RED}安装失败，请手动安装${NC}"
                        exit 1
                    fi
                else
                    echo -e "${RED}未检测到 Homebrew${NC}"
                    echo "请先安装 Homebrew 或选择其他安装方式"
                    exit 1
                fi
                ;;
            3)
                echo "请安装 Node.js 后再运行此脚本"
                exit 0
                ;;
            *)
                echo "无效选择"
                exit 1
                ;;
        esac
    else
        NODE_VERSION=$(node -v)
        echo -e "${GREEN}✓ Node.js 已安装: $NODE_VERSION${NC}"
        
        # 检查版本是否满足要求（需要 16.0 或更高）
        NODE_MAJOR=$(node -v | cut -d. -f1 | cut -dv -f2)
        if [ $NODE_MAJOR -lt 16 ]; then
            echo -e "${YELLOW}⚠ Node.js 版本过低，建议升级到 16.0 或更高版本${NC}"
        fi
    fi
}

# 检查并安装依赖
install_dependencies() {
    echo ""
    echo -e "${BLUE}正在检查项目依赖...${NC}"
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}未找到依赖，正在安装...${NC}"
        echo "这可能需要几分钟时间..."
        npm install
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ 依赖安装成功！${NC}"
        else
            echo -e "${RED}✗ 依赖安装失败${NC}"
            echo "请检查网络连接并重试"
            exit 1
        fi
    else
        echo -e "${GREEN}✓ 依赖已安装${NC}"
    fi
}

# 创建配置文件
setup_config() {
    echo ""
    echo -e "${BLUE}设置配置文件...${NC}"
    
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.local.example" ]; then
            cp .env.local.example .env.local
            echo -e "${GREEN}✓ 配置文件已创建${NC}"
            echo ""
            echo -e "${YELLOW}提示：${NC}"
            echo "如需使用 AI 功能，请编辑 .env.local 文件"
            echo "添加您的 OpenAI API Key"
        fi
    else
        echo -e "${GREEN}✓ 配置文件已存在${NC}"
    fi
}

# 创建桌面快捷方式
create_shortcut() {
    echo ""
    echo -e "${BLUE}是否创建桌面快捷方式？${NC}"
    read -p "创建桌面快捷方式？(y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        DESKTOP="$HOME/Desktop"
        SHORTCUT="$DESKTOP/Prompt Optimizer.command"
        
        # 创建符号链接
        ln -sf "$DIR/start.command" "$SHORTCUT"
        
        if [ -f "$SHORTCUT" ]; then
            echo -e "${GREEN}✓ 桌面快捷方式已创建${NC}"
        else
            echo -e "${YELLOW}⚠ 无法创建快捷方式${NC}"
        fi
    fi
}

# 测试启动
test_launch() {
    echo ""
    echo -e "${BLUE}是否立即启动应用？${NC}"
    read -p "现在启动？(y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}正在启动应用...${NC}"
        ./start.command
    fi
}

# 主流程
main() {
    # 1. 检查 Node.js
    check_node
    
    # 2. 安装依赖
    install_dependencies
    
    # 3. 设置配置文件
    setup_config
    
    # 4. 创建快捷方式（可选）
    create_shortcut
    
    # 完成
    echo ""
    echo "======================================"
    echo -e "${GREEN}✨ 安装完成！${NC}"
    echo "======================================"
    echo ""
    echo "启动方式："
    echo "  • 双击 start.command 文件"
    if [ -f "$HOME/Desktop/Prompt Optimizer.command" ]; then
        echo "  • 双击桌面上的 'Prompt Optimizer' 快捷方式"
    fi
    echo ""
    echo -e "${BLUE}感谢使用 Prompt Optimizer！${NC}"
    echo ""
    
    # 测试启动（可选）
    test_launch
}

# 运行主程序
main