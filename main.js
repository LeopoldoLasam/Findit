const KEYS = {
    items: "findit_simple_items",
    claims: "findit_simple_claims",
    history: "findit_simple_history"
};

let items = JSON.parse(localStorage.getItem(KEYS.items)) || [];
let claims = JSON.parse(localStorage.getItem(KEYS.claims)) || [];
let historyRecords = JSON.parse(localStorage.getItem(KEYS.history)) || [];

const $ = id => document.getElementById(id);


// SAVE DATA

function saveData() {
    localStorage.setItem(KEYS.items, JSON.stringify(items));
    localStorage.setItem(KEYS.claims, JSON.stringify(claims));
    localStorage.setItem(KEYS.history, JSON.stringify(historyRecords));
}


// ESCAPE HTML

function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// ACTIVITY HISTORY

function addHistory(message) {
    historyRecords.unshift({
        message,
        date: new Date().toLocaleString()
    });

    historyRecords = historyRecords.slice(0, 30);

    saveData();
}


// NAVIGATION

function showPage(page) {

    document.querySelectorAll(".page").forEach(section => {
        section.classList.toggle("active", section.id === page);
    });

    document.querySelectorAll(".nav-link").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    const titles = {
        dashboard: ["Dashboard", "Welcome to FindIt!"],
        browse: ["Browse Items", "Search and view lost and found items."],
        report: ["Report Item", "Submit a lost or found item report."],
        matches: ["Possible Matches", "Review items with similar details."],
        claims: ["Claim Requests", "View automatically matched claim requests."]
    };

    if (!titles[page]) return;

    $("pageTitle").textContent = titles[page][0];
    $("pageSubtitle").textContent = titles[page][1];

    refresh();
}


document.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});


document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.go);
    });
});


// REPORT ITEM

$("reportForm").addEventListener("submit", async event => {

    event.preventDefault();

    const file = $("itemImage").files[0];
    let image = "";

    if (file) {

        if (!file.type.startsWith("image/")) {
            alert("Please select a valid image.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Please choose an image smaller than 700 KB.");
            return;
        }

        image = await new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;

            reader.readAsDataURL(file);

        }).catch(() => "");

        if (!image) {
            alert("The image could not be loaded.");
            return;
        }
    }


    const item = {

        id: Date.now().toString(),

        type: $("reportType").value,

        name: $("itemName").value.trim(),

        category: $("category").value,

        description: $("description").value.trim(),

        color: $("color").value.trim(),

        brand: $("brand").value.trim(),

        location: $("location").value.trim(),

        date: $("itemDate").value,

        contact: $("contact").value.trim(),

        image: image,

        status: $("reportType").value === "lost" ? "Lost" : "Found",

        createdAt: new Date().toISOString()

    };


    items.unshift(item);

    addHistory(`${item.name} was reported as ${item.type}.`);

    saveData();

    event.target.reset();

    alert("Report submitted successfully!");

    showPage("dashboard");

});


// DASHBOARD

function renderDashboard() {

    $("totalReports").textContent = items.length;

    $("lostCount").textContent =
        items.filter(item => item.type === "lost").length;

    $("foundCount").textContent =
        items.filter(item => item.type === "found").length;

    $("returnedCount").textContent =
        items.filter(item => item.status === "Returned").length;


    const recent = items.slice(0, 5);

    $("recentReports").innerHTML = recent.length
        ? recent.map(item => itemCard(item, false)).join("")
        : '<div class="empty">No reports yet.</div>';


    $("recentActivity").innerHTML = historyRecords.length
        ? historyRecords.slice(0, 5).map(record => `
            <div class="activity-card">
                <p>${safe(record.message)}</p>
                <p>${safe(record.date)}</p>
            </div>
        `).join("")
        : '<div class="empty">No recent activity.</div>';

}


// ITEM CARD

function itemCard(item, actions = true) {

    return `

        <article class="item-card">

            <div class="item-top">

                <div>

                    <h3>${safe(item.name)}</h3>

                    <p>
                        ${safe(item.category)} ·
                        ${safe(item.color)}
                        ${item.brand ? "· " + safe(item.brand) : ""}
                    </p>

                </div>

                <span class="status">
                    ${safe(item.status)}
                </span>

            </div>

            <p>${safe(item.description)}</p>

            <p>
                Location: ${safe(item.location)}
                · Date: ${safe(item.date)}
            </p>

            ${item.image ? `
                <p>
                    <img src="${item.image}"
                    alt="Item image"
                    style="max-width:90px;max-height:90px;margin-top:8px;border-radius:6px">
                </p>
            ` : ""}

            ${actions ? `

                <div class="item-actions">

                    <button class="small-button secondary"
                    onclick="viewItem('${item.id}')">
                        View Details
                    </button>

                    ${item.status !== "Returned" ? `
                        <button class="small-button danger"
                        onclick="deleteItem('${item.id}')">
                            Delete
                        </button>
                    ` : ""}

                </div>

            ` : ""}

        </article>

    `;
}


// BROWSE ITEMS

function renderBrowse() {

    const search = $("searchItems").value.toLowerCase().trim();

    const filter = $("itemFilter").value;


    const filtered = items.filter(item => {

        const matchesSearch = [
            item.name,
            item.category,
            item.location,
            item.description
        ].some(value =>
            String(value).toLowerCase().includes(search)
        );


        const matchesFilter = filter === "all" ||
            item.type === filter ||
            item.status === filter;


        return matchesSearch && matchesFilter;

    });


    $("allItems").innerHTML = filtered.length
        ? filtered.map(item => itemCard(item)).join("")
        : '<div class="empty">No items found.</div>';

}


$("searchItems").addEventListener("input", renderBrowse);

$("itemFilter").addEventListener("change", renderBrowse);


// VIEW ITEM

function viewItem(id) {

    const item = items.find(entry => entry.id === id);

    if (!item) return;


    alert(
        `Item: ${item.name}\n` +
        `Type: ${item.type}\n` +
        `Category: ${item.category}\n` +
        `Description: ${item.description}\n` +
        `Location: ${item.location}\n` +
        `Date: ${item.date}\n` +
        `Status: ${item.status}\n` +
        `Contact: ${item.contact}`
    );

}


// DELETE ITEM

function deleteItem(id) {

    const item = items.find(entry => entry.id === id);

    if (!item || !confirm("Delete this report?")) return;


    items = items.filter(entry => entry.id !== id);

    addHistory(`${item.name} report was deleted.`);

    saveData();

    refresh();

}


// SMART MATCHING

function similarity(a, b) {

    const first = String(a || "").toLowerCase().trim();

    const second = String(b || "").toLowerCase().trim();


    if (!first || !second) return 0;

    if (first === second) return 1;


    const wordsA = new Set(first.split(/\s+/));

    const wordsB = new Set(second.split(/\s+/));


    const common = [...wordsA].filter(word =>
        wordsB.has(word)
    ).length;


    const total = new Set([
        ...wordsA,
        ...wordsB
    ]).size;


    return total ? common / total : 0;

}


function matchScore(lost, found) {

    const fields = [
        ["name", 25],
        ["category", 20],
        ["color", 15],
        ["brand", 10],
        ["description", 15],
        ["location", 10],
        ["date", 5]
    ];


    let score = 0;

    let weight = 0;


    fields.forEach(([key, points]) => {

        if (lost[key] && found[key]) {

            score += similarity(lost[key], found[key]) * points;

            weight += points;

        }

    });


    return weight
        ? Math.round(score / weight * 100)
        : 0;

}


// GET POSSIBLE MATCHES

function getMatches() {

    const lostItems = items.filter(item =>
        item.type === "lost" && item.status === "Lost"
    );


    const foundItems = items.filter(item =>
        item.type === "found" && item.status === "Found"
    );


    const results = [];


    lostItems.forEach(lost => {

        foundItems.forEach(found => {

            const percentage = matchScore(lost, found);

            if (percentage >= 40) {

                results.push({
                    lost,
                    found,
                    percentage
                });

            }

        });

    });


    return results.sort((a, b) =>
        b.percentage - a.percentage
    );

}


// DISPLAY POSSIBLE MATCHES

function renderMatches() {

    const matches = getMatches();


    $("matchList").innerHTML = matches.length

        ? matches.map(match => `

            <article class="item-card">

                <div class="item-top">

                    <div>

                        <h3>
                            ${safe(match.lost.name)}
                            ↔
                            ${safe(match.found.name)}
                        </h3>

                        <p>
                            Lost location:
                            ${safe(match.lost.location)}
                        </p>

                        <p>
                            Found location:
                            ${safe(match.found.location)}
                        </p>

                    </div>

                    <span class="status">
                        ${match.percentage}% similarity
                    </span>

                </div>

                <div class="item-actions">

                    <button class="small-button"
                    onclick="requestClaim('${match.lost.id}')">
                        Submit Claim
                    </button>

                </div>

            </article>

        `).join("")

        : '<div class="empty">No possible matches yet.</div>';

}


// AUTOMATIC CLAIM MATCHING

function requestClaim(lostId) {

    const lost = items.find(item =>
        item.id === lostId
    );


    if (!lost) {

        alert("Lost item report not found.");

        return;

    }


    // CLAIMANT NAME VALIDATION

    const claimantName = prompt("Enter your full name:");

    if (claimantName === null) return;


    if (claimantName.trim().length < 2) {

        alert("Please enter a valid name.");

        return;

    }


    // CONTACT VALIDATION

    const contact = prompt("Enter your contact information:");

    if (contact === null) return;


    if (contact.trim().length < 7) {

        alert("Please enter valid contact information.");

        return;

    }


    // OWNERSHIP PROOF VALIDATION

    const proof = prompt(
        "Describe specific details that can prove your ownership:"
    );

    if (proof === null) return;


    if (proof.trim().length < 10) {

        alert("Please provide at least 10 characters of ownership details.");

        return;

    }


    // SEARCH FOR FOUND ITEMS

    const possibleMatches = items

        .filter(item =>
            item.type === "found" &&
            item.status === "Found"
        )

        .map(found => ({

            foundId: found.id,

            percentage: matchScore(lost, found)

        }))

        .filter(match => match.percentage >= 40)

        .sort((a, b) =>
            b.percentage - a.percentage
        )

        .slice(0, 5);


    // DETERMINE STATUS

    const claimStatus = possibleMatches.length > 0
        ? "Matched"
        : "Unmatched";


    // CONFIRM SUBMISSION

    const confirmed = confirm(

        "Submit your claim request?\n\n" +

        "Claimant: " + claimantName.trim() + "\n" +

        "Lost Item: " + lost.name + "\n\n" +

        "The system will automatically search for matching items."

    );


    if (!confirmed) return;


    // CREATE CLAIM RECORD

    const claim = {

        id: Date.now().toString(),

        lostId: lostId,

        claimantName: claimantName.trim(),

        contact: contact.trim(),

        proof: proof.trim(),

        matches: possibleMatches,

        status: claimStatus,

        date: new Date().toLocaleString()

    };


    claims.unshift(claim);


    // SAVE HISTORY

    addHistory(

        `${claimantName.trim()} submitted a claim for ${lost.name}. Result: ${claimStatus}.`

    );


    saveData();


    // CONFIRMATION MESSAGE

    if (claimStatus === "Matched") {

        alert(

            "Claim submitted successfully!\n\n" +

            possibleMatches.length +

            " possible matching item(s) found.\n\n" +

            "Your claim status is: MATCHED"

        );

    } else {

        alert(

            "Claim submitted successfully!\n\n" +

            "No matching found items were detected.\n\n" +

            "Your claim status is: UNMATCHED"

        );

    }


    showPage("claims");

}


// DISPLAY CLAIM REQUESTS

function renderClaims() {

    $("claimList").innerHTML = claims.length

        ? claims.map(claim => {

            const lost = items.find(item =>
                item.id === claim.lostId
            );


            const claimMatches = Array.isArray(claim.matches)
                ? claim.matches
                : [];


            const statusClass = {

                Matched: "approved",

                Unmatched: "rejected"

            }[claim.status] || "pending";


            return `

                <article class="item-card">

                    <div class="item-top">

                        <div>

                            <h3>
                                ${safe(lost?.name || "Lost item report")}
                            </h3>

                            <p>
                                Claimant:
                                ${safe(claim.claimantName || "Not provided")}
                            </p>

                        </div>

                        <span class="status ${statusClass}">
                            ${safe(claim.status)}
                        </span>

                    </div>


                    <p>
                        Contact:
                        ${safe(claim.contact || "Not provided")}
                    </p>


                    <p>
                        Ownership Details:
                        ${safe(claim.proof)}
                    </p>


                    <p>
                        Submitted:
                        ${safe(claim.date)}
                    </p>


                    <div class="match-results">

                        <h4>Automatic Matching Results</h4>


                        ${claimMatches.length

                            ? claimMatches.map(match => {

                                const found = items.find(item =>
                                    item.id === match.foundId
                                );


                                return found ? `

                                    <div class="match-result-card">

                                        <strong>
                                            ${safe(found.name)}
                                        </strong>

                                        <span class="status">
                                            ${match.percentage}% Similarity
                                        </span>

                                        <p>
                                            Category:
                                            ${safe(found.category)}
                                        </p>

                                        <p>
                                            Color:
                                            ${safe(found.color)}
                                        </p>

                                        <p>
                                            Location:
                                            ${safe(found.location)}
                                        </p>

                                    </div>

                                ` : "";

                            }).join("")

                            : '<p class="muted">No possible matching items found.</p>'

                        }

                    </div>

                </article>

            `;

        }).join("")

        : '<div class="empty">No claim requests yet.</div>';

}


// REFRESH SYSTEM

function refresh() {

    renderDashboard();

    renderBrowse();

    renderMatches();

    renderClaims();

}


refresh();
    
