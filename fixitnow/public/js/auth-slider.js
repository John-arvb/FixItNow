//login.
const container = document.querySelector(".container");
const registerBtn = document.querySelector(".register-Btn");
const loginBtn = document.querySelector('.login-Btn');


registerBtn.addEventListener("click", () => {
  container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
});

