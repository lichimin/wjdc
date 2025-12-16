// 资源加载服务

/**
 * 预加载资源的类型
 */
export interface ResourceProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentResource: string;
}

/**
 * 资源加载器类
 */
export class ResourceLoader {
  private resources: string[] = [];
  private loadedCount: number = 0;
  private totalCount: number = 0;
  private progressCallback: ((progress: ResourceProgress) => void) | null = null;
  private completeCallback: (() => void) | null = null;
  private errorCallback: ((error: string) => void) | null = null;

  /**
   * 构造函数
   * @param resourceList 需要预加载的资源列表
   */
  constructor(resourceList: string[]) {
    this.resources = resourceList;
    this.totalCount = resourceList.length;
  }

  /**
   * 设置进度回调函数
   * @param callback 进度回调函数
   */
  onProgress(callback: (progress: ResourceProgress) => void): ResourceLoader {
    this.progressCallback = callback;
    return this;
  }

  /**
   * 设置完成回调函数
   * @param callback 完成回调函数
   */
  onComplete(callback: () => void): ResourceLoader {
    this.completeCallback = callback;
    return this;
  }

  /**
   * 设置错误回调函数
   * @param callback 错误回调函数
   */
  onError(callback: (error: string) => void): ResourceLoader {
    this.errorCallback = callback;
    return this;
  }

  /**
   * 开始加载资源
   */
  startLoading(): void {
    if (this.totalCount === 0) {
      this.onLoadingComplete();
      return;
    }

    this.loadedCount = 0;
    
    // 并发加载资源
    const batchSize = 50; // 每次并发加载50个资源
    
    const loadBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + batchSize, this.totalCount);
      const promises: Promise<void>[] = [];

      for (let i = startIndex; i < endIndex; i++) {
        promises.push(this.loadResource(this.resources[i]));
      }

      Promise.all(promises)
        .then(() => {
          if (endIndex < this.totalCount) {
            loadBatch(endIndex);
          } else {
            this.onLoadingComplete();
          }
        })
        .catch((error) => {
          this.onLoadingError(error instanceof Error ? error.message : 'Unknown error');
        });
    };

    loadBatch(0);
  }

  /**
   * 加载单个资源
   * @param resourcePath 资源路径
   */
  private loadResource(resourcePath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // 检查资源类型
      const extension = resourcePath.split('.').pop()?.toLowerCase();
      
      if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension || '')) {
        // 加载图片资源
        const img = new Image();
        img.onload = () => {
          this.onResourceLoaded(resourcePath);
          resolve();
        };
        img.onerror = () => {
          this.onResourceLoaded(resourcePath); // 即使加载失败也继续
          resolve();
        };
        img.src = resourcePath;
      } else if (['mp3', 'wav', 'ogg'].includes(extension || '')) {
        // 加载音频资源
        const audio = new Audio();
        audio.oncanplaythrough = () => {
          this.onResourceLoaded(resourcePath);
          resolve();
        };
        audio.onerror = () => {
          this.onResourceLoaded(resourcePath); // 即使加载失败也继续
          resolve();
        };
        audio.src = resourcePath;
      } else {
        // 对于其他类型的资源，我们可以直接认为它已加载
        this.onResourceLoaded(resourcePath);
        resolve();
      }
    });
  }

  /**
   * 单个资源加载完成时的处理
   * @param resourcePath 已加载的资源路径
   */
  private onResourceLoaded(resourcePath: string): void {
    this.loadedCount++;
    const progress: ResourceProgress = {
      loaded: this.loadedCount,
      total: this.totalCount,
      percentage: Math.floor((this.loadedCount / this.totalCount) * 100),
      currentResource: resourcePath
    };
    
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * 所有资源加载完成时的处理
   */
  private onLoadingComplete(): void {
    if (this.completeCallback) {
      this.completeCallback();
    }
  }

  /**
   * 资源加载出错时的处理
   * @param error 错误信息
   */
  private onLoadingError(error: string): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    } else {
      console.error('Resource loading error:', error);
    }
  }
}

/**
 * 获取需要预加载的核心资源列表
 * 这里只列出关键资源，避免加载过多不必要的文件
 */
export const getCoreResourceList = (): string[] => {
  const resources: string[] = [];
  
  // 添加英雄图片
  for (let i = 1; i <= 870; i++) {
    resources.push(`/res/game/v2/play2/${i}.png`);
  }
  
  // 添加怪物图片
  resources.push(
    "/res/game/monsters/wolf/1.png",
    "/res/game/monsters/wolf/2.png",
    "/res/game/monsters/wolf/3.png",
    "/res/game/monsters/wolf/4.png",
    "/res/game/monsters/wolf/5.png",
    "/res/game/monsters/wolf/6.png",
    "/res/game/monsters/wolf/7.png",
    "/res/game/monsters/wolf/8.png",
    "/res/game/monsters/wolf/9.png",
    "/res/game/monsters/wolf/10.png",
    "/res/game/monsters/wolf/11.png",
    "/res/game/monsters/wolf/12.png",
    "/res/game/monsters/wolf/13.png",
    "/res/game/monsters/wolf/14.png",
    "/res/game/monsters/wolf/15.png",
    "/res/game/monsters/wolf/16.png",
    "/res/game/monsters/wolf/17.png",
    "/res/game/monsters/wolf/18.png",
    "/res/game/monsters/wolf/19.png",
    "/res/game/monsters/wolf/20.png",
    "/res/game/monsters/wolf/21.png",
    "/res/game/monsters/wolf/22.png",
    "/res/game/monsters/wolf/23.png",
    "/res/game/monsters/wolf/24.png",
    "/res/game/monsters/wolf/25.png",
    "/res/game/monsters/wolf/26.png",
    "/res/game/monsters/wolf/27.png",
    "/res/game/monsters/wolf/28.png",
    "/res/game/monsters/wolf/29.png",
    "/res/game/monsters/wolf/30.png",
    "/res/game/monsters/wolf/31.png",
    "/res/game/monsters/wolf/32.png",
    "/res/game/monsters/wolf/33.png",
    "/res/game/monsters/wolf/34.png",
    "/res/game/monsters/wolf/35.png",
    "/res/game/monsters/wolf/36.png",
    "/res/game/monsters/wolf/37.png",
    "/res/game/monsters/wolf/38.png",
    "/res/game/monsters/wolf/39.png",
    "/res/game/monsters/wolf/40.png",
    "/res/game/monsters/wolf/41.png",
    "/res/game/monsters/wolf/42.png",
    "/res/game/monsters/wolf/43.png",
    "/res/game/monsters/wolf/44.png",
    "/res/game/monsters/wolf/45.png",
    "/res/game/monsters/wolf/46.png",
    "/res/game/monsters/wolf/47.png",
    "/res/game/monsters/wolf/48.png",
    "/res/game/monsters/wolf/49.png",
    "/res/game/monsters/wolf/50.png"
  );
  
  // 添加技能图片
  for (let i = 1; i <= 41; i++) {
    resources.push(`/res/game/skill/1/${i}.png`);
  }
  
  // 添加宝箱图片
  resources.push(
    "/res/game/v2/chest/normal.gif",
    "/res/game/v2/chest/rare.gif",
    "/res/game/v2/chest/epic.gif",
    "/res/game/v2/chest/legendary.gif"
  );
  
  // 添加场景图片
  resources.push(
    "/res/game/v2/scenes/b1-1.png",
    "/res/game/v2/scenes/b1-2.png",
    "/res/game/v2/scenes/b2-1.png",
    "/res/game/v2/scenes/b2-2.png"
  );
  
  return resources;
};

/**
 * 快速预加载核心资源
 * @param onProgress 进度回调
 * @param onComplete 完成回调
 * @param onError 错误回调
 */
export const preloadCoreResources = (
  onProgress: (progress: ResourceProgress) => void,
  onComplete: () => void,
  onError?: (error: string) => void
): ResourceLoader => {
  const resourceList = getCoreResourceList();
  const loader = new ResourceLoader(resourceList);
  
  loader.onProgress(onProgress)
       .onComplete(onComplete)
       .onError(onError || (() => {}))
       .startLoading();
  
  return loader;
};
