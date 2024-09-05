/**
 * 节点比较
 * 调用时机：节点发生变化（数量，内容）
 * 功能：比较节点数组，尽可能减少 DOM 操作
 */

/**
 * @param  n1 - 旧节点
 * @param  n2 - 新节点
 * 源码参：https://github.com/vuejs/core/blob/main/packages/runtime-core/src/renderer.ts#L373
 */

const patch = (n1, n2) => {
  if (n1 === n2) return;

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

export { patch };
