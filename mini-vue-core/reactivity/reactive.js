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
