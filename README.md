# 基于 vue3 源码 尝试 mini-vue 的实现

![gif01](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/32c554c7f10a488d9fc6a7b83eee5abd~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=531&h=130&s=475219&e=gif&f=44&b=fdfdfd)

## 1. 实现思路

- 渲染系统模块
- 响应式系统
- mini-vue 程序入口

## 2. 渲染系统模块

### 2.1 初识 h 函数

以下是 vue 的模版语法代码：

```html
<template>
  <div class="container">hello mini-vue</div>
</template>
```

它并不是传统的 html 代码，而是通过 h 函数生成的虚拟 dom 节点，h 函数接收 3 个参数：

- 第一个参数是标签名 (tag),此例中为 ‘div’
- 第二个参数是标签的属性 (props), 此例中为 ‘container’
- 第三个参数是子节点，可以是字符串、数组 (children), 此例中为 ‘hello mini-vue’

```js
/**
 * h 函数
 * 功能：返回vnode
 *
 * @param {String} tagName  - 标签名
 * @param {Object | Null} props  - 传递过来的参数
 * @param {Array | String} children  - 子节点
 * @return {vnode} 虚拟节点
 */
const h = (tagName, props, children) => {
  // 直接返回一个对象，里面包含vnode结构
  return {
    tagName,
    props,
    children,
  };
};

export default h;
```

### 2.2 创建一个 vnode

vnode 就是虚拟 dom 节点，创建方法很简单：

```js
h("div", { class: "container" }, [
  h("h1", {}, `文本：${this.data.msg},可变数字：${this.data.count}`),
  h(
    "button",
    {
      onclick: () => {
        (this.data.msg = "hello miniVue"), this.data.count++;
      },
    },
    "点击试试"
  ),
]);
```

### 2.3 挂载（mount）

`mount`函数的主要功能是将虚拟节点（`vnode`）挂载到真实的 DOM 容器（`container`）中,其重点在于递归调用，通过递归处理子节点，实现了对整个虚拟 DOM 树的挂载。

1.  **创建真实元素：**

    - 使用 `document.createElement` 创建一个具有指定标签名的真实元素。
    - 将创建的元素保存在 `vnode.el` 属性中，以便后续的操作。

2.  **处理属性（props）：**

    - 遍历虚拟节点的 `props` 属性，分别处理函数类型的事件监听器和其他类型的属性。
    - 如果属性名以 "on" 开头，将其作为事件处理函数添加到元素上。
    - 否则，使用 `setAttribute` 方法设置元素的属性。

3.  **处理子节点（children）：**

    - 如果虚拟节点有子节点，分两种情况处理：

      - 如果子节点是字符串，直接设置元素的文本内容。
      - 如果子节点是数组，递归调用 `mount` 函数挂载每个子节点。

4.  **挂载到容器中：**

    - 最后，使用 `container.appendChild` 将创建的真实元素挂载到指定的 DOM 容器中。

```js
/**
 * mount 函数
 * 功能：挂载 vnode 为 真实dom
 * 重点：递归调用处理子节点
 *
 * @param {Object} vnode -虚拟节点
 * @param {elememt} container -需要被挂载节点
 */
const mount = (vnode, container) => {
  // 1. 创建出真实元素, 同时给 vnode 添加 el 属性
  const el = (vnode.el = document.createElement(vnode.tagName));

  // 2. 处理 props
  if (vnode.props) {
    for (const key in vnode.props) {
      const value = vnode.props[key];

      // 2.1 prop 是函数
      if (key.startsWith("on")) {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        // 2.2 prop 是字符串
        el.setAttribute(key, value);
      }
    }
  }

  // 3. 处理 children
  if (vnode.children) {
    // 3.1 如果 children 是字符串，直接设置文本内容
    if (typeof vnode.children === "string") {
      el.textContent = vnode.children;
    }
    // 3.2 如果 children 是数组，递归挂载每个子节点
    else {
      // 先拿到里面的每一个 vnode
      vnode.children.forEach((item) => {
        // 再把里面的vnode递归调用
        mount(item, el);
      });
    }
  }
  // 4. 挂载
  container.appendChild(el);
};

export default mount;
```

## 3. 响应式系统

### 3.1 依赖收集与 proxy 劫持

主要包含两个功能：

1.  **观察者函数 (`watchEffect`)：**

    - 通过 `createEffect` 函数创建观察者函数，用于定义在数据变化时执行的逻辑。
    - 设置一个全局变量 `activeEffect` 作为当前活跃的观察者，以便在属性访问时收集依赖。

2.  **响应式对象创建函数 (`reactive`)：**

    - 使用 `Proxy` 对象对原始数据对象进行代理，以便捕获对对象属性的访问和修改。
    - 当访问对象属性时，通过 `getDependencies` 函数收集依赖关系，将当前观察者添加到依赖中。
    - 当设置对象属性时，通过 `set` 方法触发依赖更新，通知所有依赖的观察者执行。

```js
/**
 * 此段响应式代码主要完成两个功能：
 * 1. 创建观察者函数
 * 2. 响应式的对象创建函数
 */

// 定义一个依赖管理类
class DependencyManager {
  constructor() {
    // 使用 Set 存储订阅者（观察者）
    this.subscribers = new Set();
  }

  // 添加订阅者
  addSubscriber(subscriber) {
    if (activeEffect) {
      this.subscribers.add(subscriber);
    }
  }

  // 通知所有订阅者执行
  notifySubscribers() {
    this.subscribers.forEach((subscriber) => subscriber());
  }
}

// 定义一个全局变量，表示当前活跃的观察者
let activeEffect = null;

// 定义一个函数，用于创建并执行观察者
function createEffect(effect) {
  // 将当前观察者设置为全局活跃观察者
  activeEffect = effect;

  // 执行观察者函数
  effect();

  // 执行完后将全局活跃观察者重置为 null
  activeEffect = null;
}

// 使用 WeakMap 存储目标对象与其对应的依赖映射关系
const targetDependenciesMap = new WeakMap();

// 获取指定目标对象和键值的依赖对象
function getDependencies(target, key) {
  let dependenciesMap = targetDependenciesMap.get(target);
  // 如果目标对象还没有对应的依赖映射关系，则创建一个
  if (!dependenciesMap) {
    dependenciesMap = new Map();
    targetDependenciesMap.set(target, dependenciesMap);
  }
  let dependency = dependenciesMap.get(key);
  // 如果键值还没有对应的依赖对象，则创建一个
  if (!dependency) {
    dependency = new DependencyManager();
    dependenciesMap.set(key, dependency);
  }
  return dependency;
}

// 创建响应式对象
function createReactiveObject(raw) {
  return new Proxy(raw, {
    // 当访问对象的属性时，收集依赖
    get(target, key) {
      const dependency = getDependencies(target, key);
      dependency.addSubscriber(activeEffect);
      return target[key];
    },
    // 当设置对象的属性时，触发依赖更新
    set(target, key, newValue) {
      const dependency = getDependencies(target, key);
      target[key] = newValue;
      dependency.notifySubscribers();
      return true;
    },
  });
}

// 导出观察者函数和响应式对象创建函数
export { createEffect as watchEffect, createReactiveObject as reactive };
```

### 3.2 patch 函数

`patch`函数的核心思想是通过比较两个虚拟节点（`Vnode`）来更新实际的 DOM，以减少不必要的 DOM 操作，提高性能。它首先比较节点的标签名，如果不同则直接替换整个节点；然后比较节点的属性和事件，更新发生变化的部分；最后比较子节点，支持使用`key`进行优化，减少删除和添加的操作。这种差异比较的方式避免了不必要的 DOM 重新渲染，以更有效地实现视图的更新。这符合虚拟 DOM 的设计理念，通过最小化实际 DOM 的操作来提高性能。

```js
/**
 * 节点比较
 * 调用时机：节点发生变化（数量，内容）
 * 功能：比较节点数组，尽可能减少 DOM 操作
 */

/**
 * @param {Vnode} n1 - 旧节点
 * @param {Vnode} n2 - 新节点
 */
const patch = (n1, n2) => {
  // 节点不相同，卸载旧节点，挂载新节点
  if (n1.tagName !== n2.tagName) {
    const parentElementNode = n1.el.parentElement;
    parentElementNode.removeChild(n1.el);
    mount(n2, parentElementNode);
  } else {
    // 1. 取出 element 并保存到 n2
    const el = (n2.el = n1.el);

    // 2. 处理 props
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    for (const key in newProps) {
      const oldValue = oldProps[key];
      const newValue = newProps[key];
      // 2.1 值不同才替换
      if (oldValue !== newValue) {
        if (key.startsWith("on")) {
          el.addEventListener(key.slice(2).toLowerCase(), newValue);
        } else {
          // 2.2 prop 是字符串
          el.setAttribute(key, newValue);
        }
      }
    }
    // 3. 删除旧的 props
    for (const key in oldProps) {
      if (key.startsWith("on")) {
        const value = oldProps[key];
        el.removeEventListener(key.slice(2).toLowerCase(), value);
      }
      // 如果旧 key 不在新的 props 里
      if (!(key in newProps)) {
        el.removeAttribute(key);
      }
    }

    // 4. 处理 children
    const oldChildren = n1.children;
    const newChildren = n2.children;
    // children 字符串或者数值
    if (typeof newChildren === "string") {
      // 4.1 如果新 children 是字符串，直接设置文本内容
      if (oldChildren !== newChildren) {
        el.textContent = newChildren;
      } else {
        el.innerHTML = newChildren;
      }
    } else {
      // 4.2 如果新 children 是数组，递归挂载每个子节点
      // 如果旧 children 的是字符串
      if (typeof oldChildren === "string" || typeof oldChildren === "number") {
        el.innerHTML = "";
        // 遍历 children
        newChildren.forEach((item) => {
          mount(item, el);
        });
      } else {
        // 两个都是数组，开始 diff 算法
        // n1: [a,b,d]
        // n2: [b,a,c,f]

        /**
         * 没有 key
         */
        if (!n1.props.key && !n2.props.key) {
          // 4.3.1 获取两个 vnode 数组的公共长度，比较相同的
          const commonLength = Math.min(oldChildren.length, newChildren.length);
          for (let i = 0; i < commonLength; i++) {
            patch(oldChildren[i], newChildren[i]);
          }

          // 4.3.2 新的长度多于旧的，挂载
          if (oldChildren.length < newChildren.length) {
            newChildren.slice(oldChildren.length).forEach((item) => {
              mount(item, el);
            });
          }
          // 4.3.3 旧的长度多于新的，卸载
          if (oldChildren.length > newChildren.length) {
            oldChildren.slice(newChildren.length).forEach((item) => {
              el.removeChild(item.el);
            });
          }
        } else {
          /**
           * 有 key
           */
          // 4.4.1 根据 key 创建一个映射表，方便查找和比较
          const keyMap = {};
          oldChildren.forEach((child) => {
            if (child.props.key) {
              keyMap[child.props.key] = child;
            }
          });

          // 4.4.2 遍历新的 children 数组
          newChildren.forEach((newChild, index) => {
            const oldChild = keyMap[newChild.props.key];
            if (oldChild) {
              // 4.4.2.1 如果旧的 children 存在对应的 key，对比并更新子节点
              patch(oldChild, newChild);
              oldChildren[index] = oldChild; // 更新旧的 children 数组，方便后续删除处理
            } else {
              // 4.4.2.2 如果旧的 children 中没有对应的 key，说明是新增的节点，直接挂载
              mount(newChild, el, index);
            }
          });

          // 4.4.3 删除旧的 children 中没有对应的 key 的子节点
          oldChildren.forEach((oldChild) => {
            if (
              !oldChildren.find(
                (child) => child.props.key === oldChild.props.key
              )
            ) {
              el.removeChild(oldChild.el);
            }
          });
        }
      }
    }
  }
};

export default patch;
```

## 4. createApp 函数

当第一次挂载组件时，直接使用 mount 函数挂载就行，但如果当已经挂载了组件，需要执行 path 函数对比新旧节点，然后挂载。

同时需要使用 watchEffect 观察者函数观察并收集依赖，不然不具备响应式的能力。

以下是此 mini-vue 程序的入口文件：

```js
import h from "./renderer.js";
import mount from "./mount.js";
import patch from "./patch.js";
import { reactive, watchEffect } from "./reactive.js";

const createApp = (rootComponent) => {
  return {
    mount: (selector) => {
      let container = document.getElementById(selector);
      let isMounted = false;
      let oldVNode = null;
      watchEffect(function () {
        if (!isMounted) {
          oldVNode = rootComponent.renderTemplate();
          mount(oldVNode, container);
          isMounted = true;
        } else {
          const newVNode = rootComponent.renderTemplate();
          patch(oldVNode, newVNode);
          oldVNode = newVNode;
        }
      });
    },
  };
};

export { createApp, mount, h, reactive };
```

## 5. 测试运行

以点击按钮修改文字信息和数字自增加一的案例测试：

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>

  <body>
    <div id="app"></div>
  </body>
  <script type="module">
    import { reactive, h, createApp } from "./index.js";

    // 1.将被解析的 vue 组件
    let miniVueComponent = {
      data: reactive({
        msg: "hello world",
        count: 1,
      }),
      renderTemplate: function () {
        return h("div", { class: "container" }, [
          h("h1", {}, `文本：${this.data.msg},可变数字：${this.data.count}`),
          h(
            "button",
            {
              onclick: () => {
                (this.data.msg = "hello miniVue"), this.data.count++;
              },
            },
            "点击试试"
          ),
        ]);
      },
      method: {
        sayHello: () => {
          if (window) {
            alert(`i say ${msg}`);
          }
        },
      },
    };

    // 2. 挂载，生成真实 dom,添加到 container 容器中
    createApp(miniVueComponent).mount("app");
  </script>
</html>
```
