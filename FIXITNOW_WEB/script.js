const pages = [
  "home",
  "services",
  "how-it-works",
  "request",
  "payment",
  "track",
  "contact",
];

function showPage(id) {
  pages.forEach(function (page) {
    const element = document.getElementById(page);

    if (element) {
      if (page === id) {
        element.removeAttribute("hidden");
      } else {
        element.setAttribute("hidden", "");
      }
    }
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

const repairForm = document.querySelector("#request form");

if (repairForm) {
  repairForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const fullname = document.getElementById("fullname").value;
    const equipment = document.getElementById("equipment").value;

    const ticketNumber = "FIN-" + Math.floor(10000 + Math.random() * 90000);

    alert(
      "Repair Request Submitted!\n\n" +
        "Customer: " +
        fullname +
        "\n" +
        "Equipment: " +
        equipment +
        "\n" +
        "Ticket ID: " +
        ticketNumber +
        "\n\n" +
        "Please save your Ticket ID to track your repair.",
    );

    repairForm.reset();

    showPage("track");

    const trackInput = document.getElementById("trackInput");

    if (trackInput) {
      trackInput.value = ticketNumber;
    }
  });
}

const trackButton = document.querySelector("#track button");

if (trackButton) {
  trackButton.addEventListener("click", function () {
    const ticketInput = document.getElementById("trackInput");
    const ticketID = ticketInput.value.trim();

    if (ticketID === "") {
      alert("Please enter your Ticket ID.");
      return;
    }

    alert(
      "Ticket ID: " +
        ticketID +
        "\n\nStatus: Under Review\n\n" +
        "Our technician is currently reviewing your repair request.",
    );
  });
}

const paymentForms = document.querySelectorAll("#payment form");

if (paymentForms.length > 0) {
  paymentForms.forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      alert(
        "Payment proof submitted successfully!\n\n" +
          "Our team will verify your payment and update your repair request.",
      );

      form.reset();
    });
  });
}

const navLinks = document.querySelectorAll("nav a");

navLinks.forEach(function (link) {
  link.addEventListener("click", function () {
    navLinks.forEach(function (item) {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });
});

const serviceLinks = document.querySelectorAll("#services a");

serviceLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();
    showPage("request");
  });
});

const dateInput = document.getElementById("date");

if (dateInput) {
  const today = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("min", today);
}

showPage("home");
