const modalBg = document.getElementById("modalBg");
const openModalBtn = document.getElementById("openModalBtn");
const cancelBtn = document.getElementById("cancelBtn");

openModalBtn.addEventListener("click", () => {
  modalBg.classList.add("show");
});

cancelBtn.addEventListener("click", () => {
  modalBg.classList.remove("show");
});

// Also close modal when clicking outside the box
modalBg.addEventListener("click", (e) => {
  if (e.target === modalBg) {
    modalBg.classList.remove("show");
  }
});
