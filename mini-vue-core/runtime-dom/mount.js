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

export { mount };
