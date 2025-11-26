# 迭代解法可视化工具（数值分析课程设计）

这是我的大二数值分析课的课程设计。主要目标：把常见的求根迭代方法做成可交互的可视化，方便观察迭代过程、收敛情况和参数对结果的影响。

## 项目简介

包含两类视图：
- XY视图: 课本上的方程根的迭代解法, 有不错的可视化效果、方程语法解析、自动终止迭代（方法用的是 $|x_{n} - x_{n-1}| < \epsilon$）、误差随迭代次数变化图
- 复数域视图：用迭代法生成复平面的分形效果，支持自定义函数和迭代方式,有进度显示。


## 已实现的方法（XY）

- 基础迭代（Picard）：$x_{n+1} = g(x_n)$（未填 g(x) 时默认 $x - f(x)$）
- 艾特肯加速：$x_{n+1} = \dfrac{x_{n}z_{n+1}-y_{n+1}^2}{x_{n}-2y_{n+1}+z_{n+1}}$
- 牛顿法（Newton）：$x_{n+1} = x_{n} - \dfrac{f(x_{n})}{f'(x_{n})}$
- 单点弦截法：$x_{n+1} = x_{n} - \dfrac{f(x_{n})}{f(x_{n}) - f(x_{0})}(x_{n}-x_0)$
- 双点弦截法：$x_{n+1} = x_{n} - \dfrac{f(x_{n})}{f(x_{n}) - f(x_{n-1})}(x_{n}-x_{n-1})$
- 牛顿下山法：$x_{n+1} = x_{n} - \lambda\,(\dfrac{f(x_{n})}{f'(x_{n})})$
- 二分法：$c = \dfrac{a + b}{2}$，按符号迭代区间

## 已实现的方法（复数域）

- 牛顿法：$z_{n+1} = z_{n} - \dfrac{f(z_{n})}{f'(z_{n})}$
- 基础迭代：$z_{n+1} = g(z_{n})$（未填 $g(z)$ 时默认 $z - f(z)$）
- 双点弦截法：$x_{n+1} = x_{n} - \dfrac{f(x_{n})}{f(x_{n}) - f(x_{n-1})}(x_{n}-x_{n-1})$

## UI

- XY 视图
    
    - 右下角支持切换拖动/放缩模式。

    - 左下角有迭代日志

    - 左上角有误差随迭代次数变化图,用的和主绘图一个库(plotly.js)

- 复数视图

    - 参数变化热更新终止原有线程并重新进行计算

    - 可爱的进度条

    - 可以控制生成质量等等参数

## 技术实现要点

- 前端框架：React + TypeScript + Vite
- 图形库：plotly.js
- 数学库：mathjs，支持表达式编译、符号求导.
- 复域计算：Web Worker进行像素迭代；自写轻量复数算子（加、减、乘、除、缩放、模）降低对象创建开销；行批次上报进度消息。


## 使用方法

1. 安装依赖：
   ```bash
   npm install
   ```
2. 开发运行（预览）：
   ```bash
   npm run dev
   ```
3. 构建：
   ```bash
   npm run build
   ```
4. 打包应用：
   ```bash
   npx electron-builder
   ```


## 目录与路径

目录树:

```
.
├── src
│   ├── renderer
│   │   ├── App.tsx
│   │   ├── views
│   │   │   ├── RealRootView.tsx
│   │   │   └── FractalView.tsx
│   │   ├── workers
│   │   │   └── fractalWorker.ts
│   ├── main.ts
├── package.json
├── README.md
```



仓库链接：`https://github.com/yht0511/numerical-analysis`

