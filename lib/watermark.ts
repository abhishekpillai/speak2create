export default async function addWatermark(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const fontSize = Math.floor(img.width * 0.03);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      const text = "speak2createai";
      ctx.fillText(text, img.width - 10, img.height - 10);
      resolve(canvas.toDataURL());
    };
    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
}
