"use strict";

const STORAGE_KEY = "olushina-akeem-study-tasks";

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

const taskForm = document.querySelector("#task-form");

if (taskForm) {
  const taskList = document.querySelector("#task-list");
  const emptyState = document.querySelector("#empty-state");
  const status = document.querySelector("#planner-status");
  const taskCount = document.querySelector("#task-count");
  const completedCount = document.querySelector("#completed-count");
  const progressLabel = document.querySelector("#progress-label");
  const progressBar = document.querySelector("#progress-bar");
  const allFilterCount = document.querySelector("#all-filter-count");
  const filterButtons = document.querySelectorAll("[data-filter]");
  const clearCompletedButton = document.querySelector("#clear-completed");
  const dueDateInput = document.querySelector("#task-due");
  let activeFilter = "all";
  let tasks = [];
  let storageAvailable = true;

  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  dueDateInput.min = today.toISOString().slice(0, 10);

  function showPlannerStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function readTasks() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === null) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.every((task) => {
        if (!task || typeof task.id !== "string" ||
          typeof task.title !== "string" ||
          typeof task.course !== "string" ||
          typeof task.dueDate !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ||
          !["low", "normal", "high"].includes(task.priority) ||
          typeof task.completed !== "boolean") {
          return false;
        }
        const dueDate = new Date(`${task.dueDate}T00:00:00Z`);
        return !Number.isNaN(dueDate.getTime()) && dueDate.toISOString().slice(0, 10) === task.dueDate;
      })) {
        throw new Error("Saved planner data is not in the expected format.");
      }
      return parsed;
    } catch (error) {
      storageAvailable = false;
      showPlannerStatus("Saved tasks are unreadable or browser storage is unavailable. Clear planner data in browser settings, then reload.", true);
      return [];
    }
  }

  function saveTasks() {
    if (!storageAvailable) {
      showPlannerStatus("Changes are visible for this visit but cannot be saved because browser storage is unavailable.", true);
      return false;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch (error) {
      storageAvailable = false;
      showPlannerStatus("Your browser could not save this task. Check available storage and try again.", true);
      return false;
    }
  }

  function formatDueDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
  }

  function renderTasks() {
    const completed = tasks.filter((task) => task.completed).length;
    const total = tasks.length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    taskCount.textContent = String(total);
    completedCount.textContent = String(completed);
    progressLabel.textContent = `${progress}%`;
    progressBar.style.width = `${progress}%`;
    progressBar.parentElement.setAttribute("aria-label", `${progress}% of study tasks completed`);
    allFilterCount.textContent = String(total);

    const visibleTasks = tasks.filter((task) => {
      if (activeFilter === "active") return !task.completed;
      if (activeFilter === "completed") return task.completed;
      return true;
    }).sort((first, second) => first.dueDate.localeCompare(second.dueDate));
    taskList.replaceChildren();

    visibleTasks.forEach((task) => {
      const item = document.createElement("li");
      item.className = `task-item${task.completed ? " is-complete" : ""}`;

      const checkbox = document.createElement("input");
      checkbox.className = "task-checkbox";
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.setAttribute("aria-label", `${task.completed ? "Mark incomplete" : "Complete"}: ${task.title}`);
      checkbox.addEventListener("change", () => {
        task.completed = checkbox.checked;
        saveTasks();
        renderTasks();
      });

      const copy = document.createElement("div");
      copy.className = "task-copy";
      const title = document.createElement("p");
      title.className = "task-title";
      title.textContent = task.title;
      const meta = document.createElement("div");
      meta.className = "task-meta";
      const course = document.createElement("span");
      course.textContent = task.course;
      const due = document.createElement("span");
      due.textContent = `Due ${formatDueDate(task.dueDate)}`;
      const priority = document.createElement("span");
      priority.className = `priority-badge${task.priority === "normal" ? "" : ` is-${task.priority}`}`;
      priority.textContent = `${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`;
      meta.append(course, due, priority);
      copy.append(title, meta);

      const removeButton = document.createElement("button");
      removeButton.className = "task-delete";
      removeButton.type = "button";
      removeButton.textContent = "Delete";
      removeButton.setAttribute("aria-label", `Delete task: ${task.title}`);
      removeButton.addEventListener("click", () => {
        tasks = tasks.filter((savedTask) => savedTask.id !== task.id);
        saveTasks();
        renderTasks();
        showPlannerStatus("Study task deleted.", false);
      });

      item.append(checkbox, copy, removeButton);
      taskList.append(item);
    });

    emptyState.hidden = visibleTasks.length > 0;
    if (total > 0 && visibleTasks.length === 0) {
      emptyState.querySelector("h3").textContent = "Nothing in this view";
      emptyState.querySelector("p").textContent = "Try another filter to see your study tasks.";
    } else {
      emptyState.querySelector("h3").textContent = "No tasks yet";
      emptyState.querySelector("p").textContent = "Add a study task to start organizing your week.";
    }
  }

  tasks = readTasks();
  renderTasks();

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!taskForm.reportValidity()) return;

    const formData = new FormData(taskForm);
    const task = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: formData.get("title").trim(),
      course: formData.get("course").trim(),
      dueDate: formData.get("dueDate"),
      priority: formData.get("priority"),
      completed: false
    };

    if (!task.title || !task.course) {
      showPlannerStatus("Enter both a task name and a course or subject.", true);
      return;
    }
    tasks.push(task);
    const saved = saveTasks();
    taskForm.reset();
    activeFilter = "all";
    filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === activeFilter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    renderTasks();
    showPlannerStatus(saved ? "Study task added to your plan." : "Study task added for this visit, but could not be saved.", !saved);
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach((filterButton) => {
        const isActive = filterButton === button;
        filterButton.classList.toggle("is-active", isActive);
        filterButton.setAttribute("aria-pressed", String(isActive));
      });
      renderTasks();
    });
  });

  clearCompletedButton.addEventListener("click", () => {
    const previousCount = tasks.length;
    tasks = tasks.filter((task) => !task.completed);
    if (tasks.length === previousCount) {
      showPlannerStatus("There are no completed tasks to clear.", false);
      return;
    }
    saveTasks();
    renderTasks();
    showPlannerStatus("Completed tasks cleared.", false);
  });
}

const contactForm = document.querySelector("#contact-form");

if (contactForm) {
  const contactStatus = document.querySelector("#contact-status");
  const fields = ["contact-name", "contact-email", "contact-subject", "contact-message"]
    .map((id) => document.getElementById(id));

  function setContactStatus(message, isError) {
    contactStatus.textContent = message;
    contactStatus.classList.toggle("is-error", isError);
  }

  fields.forEach((field) => {
    field.addEventListener("input", () => {
      field.removeAttribute("aria-invalid");
      setContactStatus("", false);
    });
  });

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const invalidField = fields.find((field) => !field.checkValidity() || !field.value.trim());
    if (invalidField) {
      invalidField.setAttribute("aria-invalid", "true");
      invalidField.reportValidity();
      setContactStatus("Please check the highlighted field and complete the form.", true);
      return;
    }

    const name = document.querySelector("#contact-name").value.trim();
    const email = document.querySelector("#contact-email").value.trim();
    const subject = document.querySelector("#contact-subject").value.trim();
    const message = document.querySelector("#contact-message").value.trim();
    const emailSubject = encodeURIComponent(`Portfolio message for Olushina Akeem: ${subject}`);
    const emailBody = encodeURIComponent(`From: ${name}\nEmail: ${email}\n\n${message}`);
    setContactStatus("Your message is ready. Add Olushina’s email address in the email app to send it.", false);
    window.location.href = `mailto:?subject=${emailSubject}&body=${emailBody}`;
  });
}
