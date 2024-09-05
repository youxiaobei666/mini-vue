import { mount } from "../runtime-dom/mount.js";
import { patch } from "./patch.js";
import { watchEffect } from "../reactivity/reactive.js";

const createApp = (rootComponent) => {
  return {
    mount: (selector) => {
      let container = document.getElementById(selector);
      let isMounted = false;
      let oldVNode = null;
      watchEffect(function () {
        // 首次渲染
        if (!isMounted) {
          // 获取根组件的虚拟节点
          oldVNode = rootComponent.renderTemplate();
          mount(oldVNode, container);
          isMounted = true;
        }
        // 对比新旧节点，更新
        else {
          const newVNode = rootComponent.renderTemplate();
          // 对比新旧节点，完成节点的更新和挂载
          patch(oldVNode, newVNode);
          oldVNode = newVNode;
        }
      });
    },
    use: (plugin) => {},
  };
};

export { createApp };
