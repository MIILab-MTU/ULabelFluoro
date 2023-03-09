// ----------------------------------------------------------------------------
// Use a file reader to load a local file
// ----------------------------------------------------------------------------

const myContainer = document.querySelector('body');
const fileContainer = document.createElement('div');
fileContainer.innerHTML = '<input type="file" class="file"/>';
myContainer.appendChild(fileContainer);

const fileInput = fileContainer.querySelector('input');

function handleFile(event) {
  event.preventDefault();
  const dataTransfer = event.dataTransfer;
  const files = event.target.files || dataTransfer.files;
  if (files.length === 1) {
    myContainer.removeChild(fileContainer);
    const fileReader = new FileReader();
    fileReader.onload = function onLoad(e) {
      reader.parseAsArrayBuffer(fileReader.result);
      update();
    };
    fileReader.readAsArrayBuffer(files[0]);
  }
}

fileInput.addEventListener('change', handleFile);

// ----------------------------------------------------------------------------
// Use the reader to download a file
// ----------------------------------------------------------------------------

// reader.setUrl(`${__BASE_PATH__}/data/stl/segmentation.stl`, { binary: true }).then(update);