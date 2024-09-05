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

export { h };
