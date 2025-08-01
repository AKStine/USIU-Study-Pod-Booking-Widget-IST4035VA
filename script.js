/*
 * USIU-Africa Study Pod Booking System - JavaScript Implementation
 * Here's how I tackled this assignment and where each concept fits in:
 
 * Variables & Data Types: I'm using const for my pod data and let for bookings array, plus strings 
   for student IDs and numbers for the duplicate counter. Pretty straightforward stuff.
   
 * Control Structures: Got loads of if/else statements handling all the booking rules and validation, 
   plus a switch could've worked for error types but stuck with if/else for clarity.
   
 * Loops: Using for loops everywhere - rendering table rows, populating dropdowns, calculating insights. 
   No fancy array methods done, just the simple loops that we reviewed in class.
 
 * Functions: Built 8 different functions that each do one thing well - parsing student IDs, checking 
   time slots, validating rules. Keeps everything clean and reusable.
  
 * Events: addEventListener for form submission and click delegation for remove buttons. No inline 
   onclick stuff as instructed.
  
 * DOM Manipulation: Creating elements, updating content, managing classes - basically building the 
   entire interface dynamically. The insights panel updates in real-time which is pretty cool.
   
 */

// Core data structures (as specified in the requirements)
const pods = [
    { id: "POD-A", capacity: 4 },
    { id: "POD-B", capacity: 4 },
    { id: "POD-C", capacity: 4 },
];

const initialBookings = [
    { podId: "POD-A", time: "09:00", students: ["SIT-001", "SIT-045"] },
    { podId: "POD-B", time: "10:00", students: ["SMC-210"] },
];

// Global application state
let bookings = JSON.parse(JSON.stringify(initialBookings)); // Deep copy to prevent reference issues
let duplicateAttempts = 0; // Counter for rule violation attempts

// DOM element references
const podSelect = document.getElementById('pod-select');
const timeInput = document.getElementById('time-input');
const studentsInput = document.getElementById('students-input');
const bookingForm = document.getElementById('booking-form');
const errorsDiv = document.getElementById('errors');
const successDiv = document.getElementById('success-message');
const bookingsTableBody = document.getElementById('bookings-tbody');
const insightsContainer = document.getElementById('insights-container');

// Utility Functions (Single Responsibility Principle)

/**
 * Parses comma-separated student IDs with comprehensive cleaning
 * Handles edge cases: extra spaces, empty entries, case normalization
 */
function parseStudentIds(inputString) {
    if (!inputString || inputString.trim() === '') {
        return [];
    }
    
    const rawIds = inputString.split(',');
    const cleanIds = [];
    
    // Using traditional for loop as required (no array methods)
    for (let i = 0; i < rawIds.length; i++) {
        const trimmed = rawIds[i].trim();
        if (trimmed !== '') {
            // Design decision: Normalize to uppercase to prevent case-sensitive duplicates
            // This ensures "sit-001" and "SIT-001" are treated as the same student
            cleanIds.push(trimmed.toUpperCase());
        }
    }
    
    return cleanIds;
}

/**
 * Validates if time falls within operating hours (08:00 to 20:00, exclusive end)
 * Edge case handling: empty strings, invalid formats, exact boundary times
 */
function isWithinOperatingHours(timeString) {
    if (!timeString || timeString.trim() === '') {
        return false;
    }
    
    // Parse HH:MM format
    const timeParts = timeString.split(':');
    if (timeParts.length !== 2) {
        return false;
    }
    
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    
    // Validate parsed values
    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return false;
    }
    
    // Operating hours: 08:00 inclusive to 20:00 exclusive
    // So 08:00-19:59 are valid, but 20:00 and beyond are not
    return hour >= 8 && hour < 20;
}

/**
 * Finds existing booking for specific pod and time slot
 * Returns booking object or null if not found
 */
function findBooking(podId, timeString) {
    for (let i = 0; i < bookings.length; i++) {
        // Using === for strict equality as required
        // Justification: Prevents type coercion issues and ensures exact matching
        if (bookings[i].podId === podId && bookings[i].time === timeString) {
            return bookings[i];
        }
    }
    return null;
}

/**
 * Checks if student has conflicting booking in different pod at same time
 * Implements cross-pod clash rule
 */
function hasCrossPodClash(studentId, timeString, excludePodId) {
    for (let i = 0; i < bookings.length; i++) {
        const booking = bookings[i];
        if (booking.time === timeString && booking.podId !== excludePodId) {
            for (let j = 0; j < booking.students.length; j++) {
                if (booking.students[j] === studentId) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Custom rounding function to 1 decimal place (requirement for fill rates)
 * Avoids floating point precision issues
 */
function roundToOneDecimal(number) {
    return Math.round(number * 10) / 10;
}

/**
 * Comprehensive booking validation against all business rules
 * Returns array of error messages (empty if valid)
 */
function validateBooking(podId, timeString, studentIds) {
    const errors = [];
    
    // Rule 4: Operating hours validation
    if (!isWithinOperatingHours(timeString)) {
        errors.push("Booking time must be between 08:00 and 19:59 (20:00 is not available)");
    }
    
    // Edge case: Empty student list after parsing
    if (studentIds.length === 0) {
        errors.push("At least one valid student ID is required");
    }
    
    const existingBooking = findBooking(podId, timeString);
    
    // Rule 1: Capacity validation
    const currentStudents = existingBooking ? existingBooking.students.length : 0;
    const totalAfterBooking = currentStudents + studentIds.length;
    
    if (totalAfterBooking > 4) {
        errors.push(`Pod capacity exceeded. Current: ${currentStudents}, Adding: ${studentIds.length}, Maximum: 4`);
    }
    
    // Rule 2 & 3: Individual student conflict checking
    for (let i = 0; i < studentIds.length; i++) {
        const studentId = studentIds[i];
        
        // Rule 2: Duplicate in same pod/time slot
        if (existingBooking) {
            for (let j = 0; j < existingBooking.students.length; j++) {
                if (existingBooking.students[j] === studentId) {
                    errors.push(`Student ${studentId} is already booked in ${podId} at ${timeString}`);
                    duplicateAttempts++; // Increment global counter
                    break;
                }
            }
        }
        
        // Rule 3: Cross-pod clash detection
        if (hasCrossPodClash(studentId, timeString, podId)) {
            errors.push(`Student ${studentId} already has a booking in another pod at ${timeString}`);
            duplicateAttempts++; // Increment global counter
        }
    }
    
    return errors;
}

/**
 * Computes all daily insights using only loops and conditionals
 * No array methods like reduce, filter, map as per requirements
 */
function recomputeInsights(bookingsArray, podsArray) {
    const insights = {
        totalBookings: bookingsArray.length,
        uniqueStudents: 0,
        busiestHour: 'No bookings yet',
        podFillRates: [],
        duplicateAttempts: duplicateAttempts
    };
    
    // Calculate unique students without using Set (requirement)
    const studentTracker = [];
    for (let i = 0; i < bookingsArray.length; i++) {
        const booking = bookingsArray[i];
        for (let j = 0; j < booking.students.length; j++) {
            const student = booking.students[j];
            let alreadyCounted = false;
            
            // Check if student already in tracker
            for (let k = 0; k < studentTracker.length; k++) {
                if (studentTracker[k] === student) {
                    alreadyCounted = true;
                    break;
                }
            }
            
            if (!alreadyCounted) {
                studentTracker.push(student);
            }
        }
    }
    insights.uniqueStudents = studentTracker.length;
    
    // Find busiest hour by counting students per time slot
    const hourStudentCounts = {};
    for (let i = 0; i < bookingsArray.length; i++) {
        const booking = bookingsArray[i];
        const hour = booking.time;
        
        if (!hourStudentCounts[hour]) {
            hourStudentCounts[hour] = 0;
        }
        hourStudentCounts[hour] += booking.students.length;
    }
    
    // Find hour with maximum students
    let maxStudents = 0;
    let busiestHour = 'No bookings yet';
    for (const hour in hourStudentCounts) {
        if (hourStudentCounts[hour] > maxStudents) {
            maxStudents = hourStudentCounts[hour];
            busiestHour = hour;
        }
    }
    insights.busiestHour = busiestHour;
    
    // Calculate fill rates for each pod
    for (let i = 0; i < podsArray.length; i++) {
        const pod = podsArray[i];
        let totalBookedSeats = 0;
        let uniqueSlots = 0;
        const slotsUsed = {};
        
        // Count booked seats and unique time slots for this pod
        for (let j = 0; j < bookingsArray.length; j++) {
            const booking = bookingsArray[j];
            if (booking.podId === pod.id) {
                totalBookedSeats += booking.students.length;
                
                if (!slotsUsed[booking.time]) {
                    slotsUsed[booking.time] = true;
                    uniqueSlots++;
                }
            }
        }
        
        // Calculate fill rate: (booked seats / total possible seats) * 100
        const totalPossibleSeats = pod.capacity * uniqueSlots;
        const fillRate = totalPossibleSeats > 0 ? (totalBookedSeats / totalPossibleSeats) * 100 : 0;
        
        insights.podFillRates.push({
            podId: pod.id,
            fillRate: roundToOneDecimal(fillRate),
            slotsUsed: uniqueSlots,
            bookedSeats: totalBookedSeats
        });
    }
    
    return insights;
}

// DOM Manipulation Functions

/**
 * Populates pod selection dropdown using DOM manipulation
 * Creates options dynamically from pods array
 */
function populatePodSelect() {
    // Clear existing options
    podSelect.innerHTML = '';
    
    // Add placeholder option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Choose a study pod...';
    podSelect.appendChild(defaultOption);
    
    // Add pod options using traditional for loop
    for (let i = 0; i < pods.length; i++) {
        const pod = pods[i];
        const option = document.createElement('option');
        option.value = pod.id;
        option.textContent = `${pod.id} (Capacity: ${pod.capacity} students)`;
        podSelect.appendChild(option);
    }
}

/**
 * Renders complete bookings table using DOM manipulation and loops
 * Implements event delegation for remove buttons
 */
function renderBookingsTable() {
    // Clear existing table content
    bookingsTableBody.innerHTML = '';
    
    if (bookings.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.className = 'no-bookings';
        cell.textContent = 'No bookings yet. Create your first booking above! 📅';
        row.appendChild(cell);
        bookingsTableBody.appendChild(row);
        return;
    }
    
    // Create table rows using traditional for loop
    for (let i = 0; i < bookings.length; i++) {
        const booking = bookings[i];
        const row = document.createElement('tr');
        
        // Index column
        const indexCell = document.createElement('td');
        indexCell.textContent = (i + 1).toString();
        row.appendChild(indexCell);
        
        // Pod ID column
        const podCell = document.createElement('td');
        podCell.textContent = booking.podId;
        row.appendChild(podCell);
        
        // Time column
        const timeCell = document.createElement('td');
        timeCell.textContent = booking.time;
        row.appendChild(timeCell);
        
        // Student count column
        const countCell = document.createElement('td');
        countCell.textContent = booking.students.length.toString();
        row.appendChild(countCell);
        
        // Student IDs column
        const studentsCell = document.createElement('td');
        studentsCell.textContent = booking.students.join(', ');
        row.appendChild(studentsCell);
        
        // Actions column with remove button
        const actionsCell = document.createElement('td');
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '🗑️ Remove';
        removeBtn.setAttribute('data-booking-index', i.toString());
        actionsCell.appendChild(removeBtn);
        row.appendChild(actionsCell);
        
        bookingsTableBody.appendChild(row);
    }
}

/**
 * Renders insights panel with real-time calculated data
 * Updates whenever bookings change
 */
function renderInsights() {
    const insights = recomputeInsights(bookings, pods);
    
    // Clear existing insights
    insightsContainer.innerHTML = '';
    
    // Total bookings insight card
    const totalBookingsCard = document.createElement('div');
    totalBookingsCard.className = 'insight-card';
    totalBookingsCard.innerHTML = `
        <div class="insight-title">Total Bookings Made Today</div>
        <div class="insight-value">${insights.totalBookings}</div>
    `;
    insightsContainer.appendChild(totalBookingsCard);
    
    // Unique students insight card
    const uniqueStudentsCard = document.createElement('div');
    uniqueStudentsCard.className = 'insight-card';
    uniqueStudentsCard.innerHTML = `
        <div class="insight-title">👥 Total Unique Students Served</div>
        <div class="insight-value">${insights.uniqueStudents}</div>
    `;
    insightsContainer.appendChild(uniqueStudentsCard);
    
    // Busiest hour insight card
    const busiestHourCard = document.createElement('div');
    busiestHourCard.className = 'insight-card';
    busiestHourCard.innerHTML = `
        <div class="insight-title">⏰ Busiest Hour</div>
        <div class="insight-value">${insights.busiestHour}</div>
    `;
    insightsContainer.appendChild(busiestHourCard);
    
    // Pod fill rates insight card
    const fillRatesCard = document.createElement('div');
    fillRatesCard.className = 'insight-card';
    
    const fillRatesTitle = document.createElement('div');
    fillRatesTitle.className = 'insight-title';
    fillRatesTitle.textContent = '📊 Pod Fill Rates (% of capacity used)';
    fillRatesCard.appendChild(fillRatesTitle);
    
    const fillRatesContainer = document.createElement('div');
    fillRatesContainer.className = 'pod-fill-rates';
    
    for (let i = 0; i < insights.podFillRates.length; i++) {
        const podRate = insights.podFillRates[i];
        const rateDiv = document.createElement('div');
        rateDiv.className = 'pod-fill-rate';
        
        const podLabel = document.createElement('span');
        podLabel.textContent = `${podRate.podId}:`;
        
        const rateValue = document.createElement('span');
        rateValue.textContent = `${podRate.fillRate}% (${podRate.bookedSeats}/${podRate.slotsUsed * 4} seats)`;
        
        rateDiv.appendChild(podLabel);
        rateDiv.appendChild(rateValue);
        fillRatesContainer.appendChild(rateDiv);
    }
    
    fillRatesCard.appendChild(fillRatesContainer);
    insightsContainer.appendChild(fillRatesCard);
    
    // Duplicate attempts insight card
    const duplicatesCard = document.createElement('div');
    duplicatesCard.className = 'insight-card';
    duplicatesCard.innerHTML = `
        <div class="insight-title">🚫 Flagged Duplicate Attempts</div>
        <div class="insight-value">${insights.duplicateAttempts}</div>
    `;
    insightsContainer.appendChild(duplicatesCard);
}

/**
 * Displays error message with consistent styling
 */
function showError(message) {
    errorsDiv.textContent = message;
    errorsDiv.className = 'show';
    successDiv.className = '';
    
    // Scroll error into view for better UX
    errorsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Displays success message and focuses input for quick next entry
 */
function showSuccess(message) {
    successDiv.textContent = message;
    successDiv.className = 'success-message show';
    errorsDiv.className = '';
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => {
        successDiv.className = '';
    }, 3000);
}

/**
 * Clears all notification messages
 */
function clearMessages() {
    errorsDiv.className = '';
    successDiv.className = '';
}

// Event Handlers

/**
 * Handles form submission with complete validation and booking creation
 * Implements all business rules and provides user feedback
 */
function handleFormSubmit(event) {
    event.preventDefault();
    clearMessages();
    
    // Get form values
    const podId = podSelect.value;
    const timeString = timeInput.value;
    const studentsInputValue = studentsInput.value;
    
    // Basic input validation
    if (!podId) {
        showError('Please select a study pod');
        podSelect.focus();
        return;
    }
    
    if (!timeString) {
        showError('Please select a booking time');
        timeInput.focus();
        return;
    }
    
    if (!studentsInputValue.trim()) {
        showError('Please enter at least one student ID');
        studentsInput.focus();
        return;
    }
    
    // Parse and validate student IDs
    const studentIds = parseStudentIds(studentsInputValue);
    
    if (studentIds.length === 0) {
        showError('No valid student IDs found. Please check your input format.');
        studentsInput.focus();
        return;
    }
    
    // Check for duplicate IDs in the same request
    const uniqueIds = [];
    for (let i = 0; i < studentIds.length; i++) {
        const id = studentIds[i];
        let isDuplicate = false;
        
        for (let j = 0; j < uniqueIds.length; j++) {
            if (uniqueIds[j] === id) {
                isDuplicate = true;
                break;
            }
        }
        
        if (isDuplicate) {
            showError(`Duplicate student ID found in request: ${id}`);
            studentsInput.focus();
            return;
        }
        
        uniqueIds.push(id);
    }
    
    // Validate against business rules
    const validationErrors = validateBooking(podId, timeString, studentIds);
    
    if (validationErrors.length > 0) {
        showError(validationErrors.join(' | '));
        return;
    }
    
    // Create or merge booking
    const existingBooking = findBooking(podId, timeString);
    
    if (existingBooking) {
        // Add students to existing booking
        for (let i = 0; i < studentIds.length; i++) {
            existingBooking.students.push(studentIds[i]);
        }
    } else {
        // Create new booking
        bookings.push({
            podId: podId,
            time: timeString,
            students: [...studentIds] // Create copy to avoid reference issues
        });
    }
    
    // Update UI
    renderBookingsTable();
    renderInsights();
    
    // Success feedback and reset form for next booking
    const studentCount = studentIds.length;
    const studentText = studentCount === 1 ? 'student' : 'students';
    showSuccess(`✅ Successfully booked ${studentCount} ${studentText} in ${podId} at ${timeString}`);
    
    // Reset form and focus for quick librarian workflow
    studentsInput.value = '';
    studentsInput.focus();
}

/**
 * Handles booking removal using event delegation
 * Allows dynamic removal without rebinding events
 */
function handleRemoveBooking(event) {
    if (event.target.classList.contains('remove-btn')) {
        const bookingIndex = parseInt(event.target.getAttribute('data-booking-index'), 10);
        
        // Validate index bounds
        if (bookingIndex >= 0 && bookingIndex < bookings.length) {
            const removedBooking = bookings[bookingIndex];
            
            // Remove booking from array
            bookings.splice(bookingIndex, 1);
            
            // Update UI
            renderBookingsTable();
            renderInsights();
            
            // Confirmation feedback
            const studentCount = removedBooking.students.length;
            const studentText = studentCount === 1 ? 'student' : 'students';
            showSuccess(`🗑️ Removed booking: ${studentCount} ${studentText} from ${removedBooking.podId} at ${removedBooking.time}`);
        }
    }
}

/**
 * Handles input formatting and validation as user types
 */
function handleStudentInputChange(event) {
    const input = event.target.value;
    
    // Basic format hint for user
    if (input.includes(' ,') || input.includes(', ')) {
        // User is following correct format, clear any previous errors
        clearMessages();
    }
}

// Application Initialization

/**
 * Initializes the entire application
 * Sets up DOM, events, and renders initial state
 */
function initializeApp() {
    // Set up initial DOM state
    populatePodSelect();
    renderBookingsTable();
    renderInsights();
    
    // Bind event listeners (no inline onclick as required)
    bookingForm.addEventListener('submit', handleFormSubmit);
    studentsInput.addEventListener('input', handleStudentInputChange);
    
    // Event delegation for dynamically created remove buttons
    bookingsTableBody.addEventListener('click', handleRemoveBooking);
    
    // Set reasonable default time (current hour or next available hour)
    const now = new Date();
    const currentHour = now.getHours();
    const defaultHour = currentHour >= 8 && currentHour < 19 ? currentHour : 9;
    timeInput.value = `${defaultHour.toString().padStart(2, '0')}:00`;
    
    // Focus first input for immediate use
    podSelect.focus();
    
    console.log('USIU Study Pod Booking System initialized successfully!');
    console.log(`Current status: ${bookings.length} bookings, ${pods.length} pods available`);
}

// Start the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded
    initializeApp();
}
