## FixItNow

## Project Overview

FixItNow is a web-based equipment repair request and service management system. It allows users to submit repair requests, view service information, and track the status of their requests.

The website is designed to make the repair process easier by organizing customer requests and showing clear updates from submission to completion.

# Features

* Submit an equipment repair request
* Enter customer and equipment information
* Describe the problem or repair needed
* Generate a request ID
* Track the status of a repair request
* View available repair services
* Display repair request information
* Update request status
* Use a simple and responsive interface
* Validate required form fields

# Technologies Used

* HTML
* CSS
* JavaScript
* Git
* GitHub
* Visual Studio Code

# Project Structure

* FixItNow/ — main project folder

  * index.html — main webpage and structure
  * style.css — website design and styling
  * script.js — website functionality and interactions
  * README.md — project documentation

# How It Works

The user starts by viewing the FixItNow website and selecting the service or repair they need.

The user can then submit a repair request by providing information such as their name, contact details, equipment, and description of the problem.

After submitting the form, the system generates a request ID. This ID can be used to identify and track the repair request.

The repair request can have different statuses:

* **Pending** — The request has been submitted.
* **Under Review** — The request is being checked.
* **In Repair** — The equipment is currently being repaired.
* **Completed** — The repair has been finished.

## Main Sections

### Home

The Home section introduces FixItNow and provides users with quick access to the main services.

### Services

The Services section displays the different types of equipment repair services available.

### How It Works

This section explains the repair process from submitting a request to completing the repair.

### Repair Request

The Repair Request section contains the form where users provide their information and describe the equipment problem.

### Track Request

The Track Request section allows users to check the current status of their repair request using their request ID.

### Contact

The Contact section provides information that users can use to contact the repair service.

## Terms and Definitions

* **HTML**: Language used to create the structure and content of a webpage.
* **CSS**: Language used to style and design a webpage.
* **JavaScript**: Programming language used to add functionality and interactions to the website.
* **Git**: Version control system used to track changes in the project.
* **GitHub**: Online platform used to store and collaborate on the project repository.
* **Repository**: A project folder stored and managed using Git.
* **Request ID**: A unique identifier given to a repair request.
* **Repair Request**: A form submitted by a user asking for equipment repair.
* **Status**: Shows the current stage of a repair request.
* **Form**: A section where users enter and submit information.
* **Validation**: The process of checking if the information entered by the user is correct or complete.
* **Responsive Design**: A design that allows a website to work on different screen sizes.
* **DOM**: The Document Object Model that JavaScript uses to interact with HTML elements.
* **Event**: An action performed by the user, such as clicking a button or submitting a form.
* **Function**: A reusable block of JavaScript code that performs a specific task.

### Example: How HTML Works

```html
<div class="service-card">
  <h2>Computer Repair</h2>
  <p>Repair and maintenance for computers.</p>
</div>
```

This creates a service card containing a title and description. HTML provides the structure of the content.

### Example: How CSS Works

```css
.service-card {
  background-color: #222;
  padding: 20px;
  border-radius: 10px;
}
```

This changes the appearance of the service card by adding a background color, spacing, and rounded corners.

### Example: How JavaScript Works

```javascript
function submitRequest() {
  alert("Repair request submitted!");
}
```

This creates a function that displays a message when the repair request is submitted.

## GitHub Collaboration

The project uses GitHub to allow multiple group members to work on the same project.

Each member can clone the repository, create or edit files, commit changes, and push their work to GitHub.

Example Git commands:

```bash
git clone <repository-url>

git add .

git commit -m "Update FixItNow"

git push
```

## Setup and Running

Clone the repository:

```bash
git clone <repository-url>
```

Open the project folder:

```bash
cd FixItNow
```

Open `index.html` in a browser, or use the **Live Server** extension in Visual Studio Code to run the website.

## Tags / Keywords

* Web Application
* FixItNow
* Equipment Repair
* Repair Request
* Service Management
* HTML
* CSS
* JavaScript
* Git
* GitHub
* Visual Studio Code
* Responsive Design
* Request Tracking

## Purpose

This project demonstrates how to build a simple web-based repair service system using HTML, CSS, and JavaScript.

It demonstrates important web development concepts such as forms, user input, validation, JavaScript interactions, request tracking, responsive design, and GitHub collaboration.
