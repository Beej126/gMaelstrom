export const loadScript = async (
  isLoaded: () => boolean,
  src: string
) => {
  if (isLoaded()) return;
  const failMessage = new Error("Failed to load: " + (new URL(src).pathname));
  return await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => isLoaded() ? resolve() : reject(failMessage);
      script.onerror = () => reject(failMessage);
      document.body.appendChild(script);
    });
  }
