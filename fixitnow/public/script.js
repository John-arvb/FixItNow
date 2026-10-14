const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-Btn');
const loginBtn = document.querySelector('.login-Btn');

registerBtn.addEventListener('click', () => {
  container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
  container.classList.remove('active');
});


const STORAGE_KEY = "fixitnow_tickets";

function getTickets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveTicket(ticket) {
  const tickets = getTickets();
  tickets.push(ticket);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

function findTicket(id) {
  return getTickets().find(function (ticket) {
    return ticket.id === id.toUpperCase();
  });
}

function generateTicketId() {
  let id;
  do {
    id = "FIN-" + Math.floor(10000 + Math.random() * 90000);
  } while (findTicket(id));
  return id;
}

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
  if (!pages.includes(id)) {
    id = "home";
  }

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

  document.querySelectorAll("nav a").forEach(function (link) {
    link.classList.toggle("active", link.getAttribute("href") === "#" + id);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

window.addEventListener("hashchange", function () {
  showPage(location.hash.slice(1));
});

// ===== REPAIR REQUEST FORM =====
const repairForm = document.querySelector("#request form");

if (repairForm) {
  repairForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const fullname = document.getElementById("fullname").value;
    const equipment = document.getElementById("equipment").value;
    const ticketNumber = generateTicketId();

    saveTicket({
      id: ticketNumber,
      fullname: fullname,
      contact: document.getElementById("contactNumber").value,
      email: document.getElementById("email").value,
      equipment: equipment,
      serviceDate: document.getElementById("date").value,
      problem: document.getElementById("problem").value,
      status: "Under Review",
      createdAt: new Date().toISOString(),
      payment: null,
    });

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
    location.hash = "#track";

    const trackInput = document.getElementById("trackInput");
    if (trackInput) {
      trackInput.value = ticketNumber;
    }
  });
}

// ===== TRACK REQUEST =====
const trackButton = document.querySelector("#track button");

if (trackButton) {
  trackButton.addEventListener("click", function () {
    const ticketInput = document.getElementById("trackInput");
    const ticketID = ticketInput.value.trim();

    if (ticketID === "") {
      alert("Please enter your Ticket ID.");
      return;
    }

    if (!/^FIN-\d{5}$/i.test(ticketID)) {
      alert("Invalid Ticket ID. Use the format FIN-12345.");
      return;
    }

    const ticket = findTicket(ticketID);

    if (!ticket) {
      alert("Ticket not found. Please check your Ticket ID and try again.");
      return;
    }

    alert(
      "Ticket ID: " +
        ticket.id +
        "\nCustomer: " +
        ticket.fullname +
        "\nEquipment: " +
        ticket.equipment +
        "\nStatus: " +
        ticket.status +
        (ticket.payment
          ? "\nPayment: Proof submitted"
          : "\nPayment: Not yet submitted"),
    );
  });
}

// ===== PAYMENT PROOF FORM =====
const paymentForms = document.querySelectorAll("#payment form");

paymentForms.forEach(function (form) {
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const fileInput = document.getElementById("paymentScreenshot");
    const file = fileInput.files[0];

    if (!file || !file.type.startsWith("image/")) {
      alert("Please upload an image file (JPG, PNG, etc.).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Maximum size is 2 MB.");
      return;
    }

    const ticketRef = document.getElementById("ticketRef").value.trim();
    const tickets = getTickets();
    const ticket = tickets.find(function (t) {
      return t.id === ticketRef.toUpperCase();
    });

    if (!ticket) {
      alert("Ticket ID not found. Please enter a valid Ticket ID.");
      return;
    }

    ticket.payment = {
      method: document.getElementById("paymentMethod").value,
      amount: document.getElementById("paymentAmount").value,
      submittedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));

    alert(
      "Payment proof submitted successfully!\n\n" +
        "Our team will verify your payment and update your repair request.",
    );

    form.reset();
  });
});

// ===== NAV HIGHLIGHT =====
const navLinks = document.querySelectorAll("nav a");

navLinks.forEach(function (link) {
  link.addEventListener("click", function () {
    navLinks.forEach(function (item) {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });
});

// ===== SERVICES LINKS =====
const serviceLinks = document.querySelectorAll("#services a");

serviceLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();
    showPage("request");
  });
});

// ===== DATE MINIMUM =====
const dateInput = document.getElementById("date");

if (dateInput) {
  const now = new Date();
  const today =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0");
  dateInput.setAttribute("min", today);
}

showPage(location.hash.slice(1));
