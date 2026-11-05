function readPhotoBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function compressPhoto(blob) {
  try {
    const image = await createImageBitmap(blob);
    const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();
    const compressed = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
    return await readPhotoBlob(compressed || blob);
  } catch (_) {
    return readPhotoBlob(blob);
  }
}

async function exportPublishedContent() {
  const content = {};

  for (const item of entries) {
    const db = await openPhotoDB();
    const photos = await new Promise((resolve, reject) => {
      const request = db.transaction("photos").objectStore("photos").get(item.id);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    db.close();

    content[item.id] = {
      title: localStorage.getItem("title-" + item.id) || item.title,
      text: localStorage.getItem("note-" + item.id) || item.description,
      photos: await Promise.all(photos.map(compressPhoto))
    };
  }

  const source = "window.publishedContent = " + JSON.stringify(content, null, 2) + ";";
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  link.download = "content.js";
  link.click();
  URL.revokeObjectURL(link.href);
  return source.length;
}

document.getElementById("exportSite").onclick = (event) => {
  const button = event.currentTarget;
  button.textContent = "EXPORTING...";
  exportPublishedContent()
    .then((size) => {
      const mb = (size / 1048576).toFixed(2);
      button.textContent = size > 25000000 ? "STILL TOO LARGE: " + mb + " MB" : "CONTENT.JS DOWNLOADED: " + mb + " MB";
    })
    .catch(() => { button.textContent = "EXPORT FAILED — TRY AGAIN"; })
    .finally(() => setTimeout(() => { button.textContent = "↓ EXPORT CONTENT FOR GITHUB"; }, 2000));
};
