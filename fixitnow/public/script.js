//login
const container = document.querySelector(".container");
const registerBtn = document.querySelector(".register-Btn");

//encryption
const bcrypt = require("bcrypt");

registerBtn.addEventListener("click", () => {
  container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
});

