// API Configuration - استخدام relative paths
const API_BASE = window.location.origin;
const API_URL = `${API_BASE}/api/users`;

// أو استخدم هذا الكود الأكثر أماناً:
const getAPIBase = () => {
  // إذا كان في development، استخدم localhost وإلا استخدم الـ origin
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:5000";
  }
  return window.location.origin;
};

const API_BASE = getAPIBase();
const API_URL = `${API_BASE}/api/users`;

// DOM elements
const userForm = document.getElementById("userForm");
const usersList = document.getElementById("usersList");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");
const clearBtn = document.getElementById("clearBtn");
const refreshBtn = document.getElementById("refreshBtn");
const searchInput = document.getElementById("searchInput");
const loadingSpinner = document.getElementById("loadingSpinner");
const totalUsers = document.getElementById("totalUsers");
const shownCount = document.getElementById("shownCount");
const totalCount = document.getElementById("totalCount");

// Global variables
let editingUserId = null;
let allUsers = [];
let currentUsers = [];

// Validation patterns
const VALIDATION_PATTERNS = {
  phone: /^(?:\+20|0)?1[0125][0-9]{8}$/,
  carNumber: /^[0-9]{1,8}$/,
};

// Event listeners
document.addEventListener("DOMContentLoaded", initializeApp);
userForm.addEventListener("submit", handleFormSubmit);
cancelBtn.addEventListener("click", cancelEdit);
clearBtn.addEventListener("click", clearForm);
refreshBtn.addEventListener("click", loadUsers);
searchInput.addEventListener("input", handleSearch);

// Initialize application
function initializeApp() {
  console.log("🚀 Initializing application...");
  console.log("📡 API URL:", API_URL);
  loadUsers();
  setupRealTimeValidation();
  showToast("System", "Application loaded successfully!", "success");
}

// Load all users
async function loadUsers() {
  showLoading();
  try {
    console.log("🔍 Fetching users from:", API_URL);
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      mode: "cors",
    });

    console.log("📡 Response status:", response.status);

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} - ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("📊 Users data:", result);

    if (result.success) {
      allUsers = result.data || [];
      currentUsers = [...allUsers];
      displayUsers(allUsers);
      updateUserCount(allUsers.length);
      updateListCount();
      showToast("Success", `Loaded ${allUsers.length} users`, "success");
    } else {
      throw new Error(result.message || "Unknown error occurred");
    }
  } catch (error) {
    console.error("❌ Error loading users:", error);
    showToast("Error", `Failed to load users: ${error.message}`, "error");
    allUsers = [];
    currentUsers = [];
    displayUsers([]);
  } finally {
    hideLoading();
  }
}

// Display users in the list
function displayUsers(users) {
  usersList.innerHTML = "";

  if (users.length === 0) {
    usersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No Users Found</h3>
                <p>Add your first user to get started</p>
            </div>
        `;
    return;
  }

  users.forEach((user) => {
    const userCard = createUserCard(user);
    usersList.appendChild(userCard);
  });
}

// Create user card element
function createUserCard(user) {
  const userCard = document.createElement("div");
  userCard.className = "user-card";

  const birthDate = new Date(user.birthDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const createdDate = new Date(user.createdAt).toLocaleDateString();

  userCard.innerHTML = `
        <div class="user-info">
            <h3>${escapeHtml(user.username)}</h3>
            <div class="user-details">
                <div class="user-detail">
                    <i class="fas fa-phone"></i>
                    <span>${escapeHtml(user.phoneNumber)}</span>
                </div>
                <div class="user-detail">
                    <i class="fas fa-birthday-cake"></i>
                    <span>${birthDate}</span>
                </div>
                <div class="user-detail">
                    <i class="fas fa-venus-mars"></i>
                    <span>${
                      user.gender.charAt(0).toUpperCase() + user.gender.slice(1)
                    }</span>
                </div>
                <div class="user-detail">
                    <i class="fas fa-car"></i>
                    <span>${escapeHtml(user.carType)} (${escapeHtml(
    user.carNumber
  )})</span>
                </div>
                <div class="user-detail">
                    <i class="fas fa-calendar-plus"></i>
                    <span>Added: ${createdDate}</span>
                </div>
            </div>
        </div>
        <div class="user-actions">
            <button class="edit-btn" onclick="editUser('${user._id}')">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="delete-btn" onclick="deleteUser('${user._id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;

  return userCard;
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    showToast(
      "Validation Error",
      "Please fix the errors in the form",
      "warning"
    );
    return;
  }

  const userData = {
    username: document.getElementById("username").value.trim(),
    phoneNumber: document.getElementById("phoneNumber").value.trim(),
    birthDate: document.getElementById("birthDate").value,
    gender: document.getElementById("gender").value,
    carNumber: document.getElementById("carNumber").value.trim(),
    carType: document.getElementById("carType").value.trim(),
  };

  showLoading();
  try {
    let response, result;

    if (editingUserId) {
      // Update existing user
      response = await fetch(`${API_URL}/${editingUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
    } else {
      // Create new user
      response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
    }

    result = await response.json();

    if (result.success) {
      showToast(
        "Success",
        editingUserId
          ? "User updated successfully"
          : "User created successfully",
        "success"
      );
      resetForm();
      await loadUsers();
    } else {
      showToast("Error", result.message, "error");

      // Show field-specific errors
      if (result.errors) {
        result.errors.forEach((error) => {
          showFieldError(error.path, error.msg);
        });
      }
    }
  } catch (error) {
    console.error("Error saving user:", error);
    showToast("Error", "Failed to save user. Please try again.", "error");
  } finally {
    hideLoading();
  }
}

// Validate form
function validateForm() {
  let isValid = true;
  const fields = [
    "username",
    "phoneNumber",
    "birthDate",
    "gender",
    "carNumber",
    "carType",
  ];

  fields.forEach((field) => {
    if (!validateField({ target: document.getElementById(field) })) {
      isValid = false;
    }
  });

  return isValid;
}

// Validate individual field
function validateField(e) {
  const field = e.target;
  const value = field.value.trim();
  const fieldName = field.id;
  let isValid = true;
  let errorMessage = "";

  switch (fieldName) {
    case "username":
      if (!value) {
        isValid = false;
        errorMessage = "Username is required";
      } else if (value.length < 2) {
        isValid = false;
        errorMessage = "Username must be at least 2 characters long";
      } else if (value.length > 50) {
        isValid = false;
        errorMessage = "Username cannot exceed 50 characters";
      }
      break;

    case "phoneNumber":
      if (!value) {
        isValid = false;
        errorMessage = "Phone number is required";
      } else if (!VALIDATION_PATTERNS.phone.test(value)) {
        isValid = false;
        errorMessage =
          "Please enter a valid Egyptian phone number (e.g., 01012345678 or +201012345678)";
      }
      break;

    case "birthDate":
      if (!value) {
        isValid = false;
        errorMessage = "Birth date is required";
      } else if (new Date(value) >= new Date()) {
        isValid = false;
        errorMessage = "Birth date must be in the past";
      }
      break;

    case "gender":
      if (!value) {
        isValid = false;
        errorMessage = "Please select a gender";
      }
      break;

    case "carNumber":
      if (!value) {
        isValid = false;
        errorMessage = "Car number is required";
      } else if (!VALIDATION_PATTERNS.carNumber.test(value)) {
        isValid = false;
        errorMessage = "Car number must contain only numbers (1-8 digits)";
      }
      break;

    case "carType":
      if (!value) {
        isValid = false;
        errorMessage = "Car type is required";
      } else if (value.length < 2) {
        isValid = false;
        errorMessage = "Car type must be at least 2 characters long";
      } else if (value.length > 50) {
        isValid = false;
        errorMessage = "Car type cannot exceed 50 characters";
      }
      break;
  }

  if (isValid) {
    clearFieldError(e);
  } else {
    showFieldError(fieldName, errorMessage);
  }

  return isValid;
}

// Show field error
function showFieldError(fieldName, message) {
  const field = document.getElementById(fieldName);
  const errorElement = document.getElementById(`${fieldName}Error`);

  if (field && errorElement) {
    field.classList.add("error");
    errorElement.textContent = message;
    errorElement.classList.add("show");
  }
}

// Clear field error
function clearFieldError(e) {
  const field = e.target;
  const fieldName = field.id;
  const errorElement = document.getElementById(`${fieldName}Error`);

  if (field && errorElement) {
    field.classList.remove("error");
    errorElement.classList.remove("show");
  }
}

// Edit user
async function editUser(userId) {
  try {
    const response = await fetch(`${API_URL}/${userId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      const user = result.data;

      // Fill form with user data
      document.getElementById("userId").value = user._id;
      document.getElementById("username").value = user.username;
      document.getElementById("phoneNumber").value = user.phoneNumber;
      document.getElementById("birthDate").value = user.birthDate.split("T")[0];
      document.getElementById("gender").value = user.gender;
      document.getElementById("carNumber").value = user.carNumber;
      document.getElementById("carType").value = user.carType;

      // Change form to edit mode
      editingUserId = userId;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Update User';
      cancelBtn.style.display = "flex";

      // Scroll to form
      document.querySelector(".form-section").scrollIntoView({
        behavior: "smooth",
      });

      showToast("Edit Mode", `Editing user: ${user.username}`, "info");
    } else {
      showToast("Error", result.message, "error");
    }
  } catch (error) {
    console.error("Error loading user for edit:", error);
    showToast("Error", "Failed to load user for editing", "error");
  }
}

// Delete user
async function deleteUser(userId) {
  const user = allUsers.find((u) => u._id === userId);
  if (!user) return;

  if (
    confirm(
      `Are you sure you want to delete user "${user.username}"?\n\nPhone: ${user.phoneNumber}\nCar: ${user.carType} (${user.carNumber})\n\nThis action cannot be undone!`
    )
  ) {
    try {
      const response = await fetch(`${API_URL}/${userId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        showToast("Success", "User deleted successfully", "success");
        await loadUsers();
      } else {
        showToast("Error", result.message, "error");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast("Error", "Failed to delete user", "error");
    }
  }
}

// Handle search
function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  if (searchTerm === "") {
    currentUsers = [...allUsers];
    displayUsers(allUsers);
  } else {
    currentUsers = allUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(searchTerm) ||
        user.phoneNumber.includes(searchTerm) ||
        user.carNumber.includes(searchTerm) ||
        user.carType.toLowerCase().includes(searchTerm) ||
        user.gender.toLowerCase().includes(searchTerm)
    );
    displayUsers(currentUsers);
  }

  updateListCount();
}

// Cancel edit
function cancelEdit() {
  resetForm();
  showToast("Info", "Edit cancelled", "info");
}

// Clear form
function clearForm() {
  resetForm();
  showToast("Info", "Form cleared", "info");
}

// Reset form
function resetForm() {
  userForm.reset();
  document.getElementById("userId").value = "";
  editingUserId = null;
  submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add User';
  cancelBtn.style.display = "none";

  // Clear all error messages
  const errorMessages = document.querySelectorAll(".error-message");
  errorMessages.forEach((error) => error.classList.remove("show"));

  const errorFields = document.querySelectorAll(".error");
  errorFields.forEach((field) => field.classList.remove("error"));
}

// Show toast notification
function showToast(title, message, type = "info") {
  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle",
  };

  toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <div class="toast-content">
            <h4>${escapeHtml(title)}</h4>
            <p>${escapeHtml(message)}</p>
        </div>
    `;

  toastContainer.appendChild(toast);

  // Show toast
  setTimeout(() => toast.classList.add("show"), 100);

  // Remove toast after 5 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 5000);
}

// Show loading spinner
function showLoading() {
  loadingSpinner.classList.add("show");
  usersList.style.opacity = "0.5";
}

// Hide loading spinner
function hideLoading() {
  loadingSpinner.classList.remove("show");
  usersList.style.opacity = "1";
}

// Update user count
function updateUserCount(count) {
  if (totalUsers) {
    totalUsers.textContent = count;
  }
}

// Update list count
function updateListCount() {
  if (shownCount && totalCount) {
    shownCount.textContent = currentUsers.length;
    totalCount.textContent = allUsers.length;
  }
}

// Utility function to escape HTML
function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Global functions for HTML onclick
window.editUser = editUser;
window.deleteUser = deleteUser;
