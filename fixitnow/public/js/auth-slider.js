//login
const container = document.querySelector(".container");
const registerBtn = document.querySelector(".register-Btn");

registerBtn.addEventListener("click", () => {
  container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
});

