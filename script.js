// Moneed Oila hisobi - Kirim, Chiqim, Budjet va Oylik monitoring

// Oylarning o'zbekcha nomlari
const monthNamesUz = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

// Kategoriyalar ro'yxati va ularning ranglari
const expenseCategories = [
  { name: "Oziq-ovqat", color: "#10b981" },
  { name: "Kommunal", color: "#0284c7" },
  { name: "Salomatlik", color: "#ec4899" },
  { name: "Ta'lim", color: "#1a62ff" },
  { name: "Transport", color: "#f59e0b" },
  { name: "Kredit", color: "#ef4444" },
  { name: "Kitob", color: "#8b5cf6" },
  { name: "Boshqa", color: "#64748b" }
];

const incomeCategories = [
  { name: "Oylik maosh", color: "#10b981" },
  { name: "Pensiya", color: "#06b6d4" },
  { name: "Biznes / Savdo", color: "#f59e0b" },
  { name: "Yordam / Hadiya", color: "#8b5cf6" },
  { name: "Boshqa kirim", color: "#64748b" }
];

// Kategoriya ranglari xaritasi
const categoryColors = {};
[...expenseCategories, ...incomeCategories].forEach((c) => {
  categoryColors[c.name] = c.color;
});

// Boshlang'ich namuna ma'lumotlar
const initialSampleData = [
  { id: 1, title: "Oylik maosh", amount: 5000000, category: "Oylik maosh", type: "income", date: "2026-09-05" },
  { id: 2, title: "Pensiya", amount: 1500000, category: "Pensiya", type: "income", date: "2026-09-10" },
  { id: 3, title: "Kredit to'lovi", amount: 400000, category: "Kredit", type: "expense", date: "2026-09-12" },
  { id: 4, title: "O'qish to'lovi", amount: 300000, category: "Ta'lim", type: "expense", date: "2026-09-15" },
  { id: 5, title: "Kommunal to'lovlar", amount: 180000, category: "Kommunal", type: "expense", date: "2026-09-18" },
  { id: 6, title: "Bozorlik (Oziq-ovqat)", amount: 250000, category: "Oziq-ovqat", type: "expense", date: "2026-09-20" },
  { id: 7, title: "Kitob", amount: 50000, category: "Kitob", type: "expense", date: "2026-09-22" },
  { id: 8, title: "Taxi", amount: 15000, category: "Transport", type: "expense", date: "2026-09-25" }
];

// Asosiy dastur holatlari
let expenses = [];
let monthlyBudgets = { default: 5000000 };
let currentMonth = new Date().toISOString().slice(0, 7); // "2026-09"
let isAllMonthsView = false;
let currentHistoryFilter = "all"; // "all" | "expense" | "income"
let isBalanceMasked = false;

// DOM elementlari
const expenseForm = document.getElementById("expenseForm");
const titleInput = document.getElementById("expenseTitle");
const amountInput = document.getElementById("expenseAmount");
const dateInput = document.getElementById("expenseDate");
const categorySelect = document.getElementById("expenseCategory");
const categoryChips = document.getElementById("categoryChips");
const transactionTypeInput = document.getElementById("transactionType");
const errorMessage = document.getElementById("errorMessage");
const submitBtnText = document.getElementById("submitBtnText");
const addBtn = document.getElementById("addBtn");

// Statistika va ko'rsatkich elementlari
const netBalanceAmount = document.getElementById("netBalanceAmount");
const totalIncomeAmount = document.getElementById("totalIncomeAmount");
const totalExpenseElement = document.getElementById("totalExpense");
const budgetLimitText = document.getElementById("budgetLimitText");
const budgetProgressFill = document.getElementById("budgetProgressFill");
const budgetRemainingText = document.getElementById("budgetRemainingText");
const budgetPercentText = document.getElementById("budgetPercentText");
const monthlyBudgetInput = document.getElementById("monthlyBudgetInput");

// Ro'yxat elementlari
const expenseListElement = document.getElementById("expenseList");
const emptyListNotice = document.getElementById("emptyListNotice");
const recentExpenseList = document.getElementById("recentExpenseList");
const emptyRecentNotice = document.getElementById("emptyRecentNotice");
const categoryStatsElement = document.getElementById("categoryStats");
const emptyCategoryNotice = document.getElementById("emptyCategoryNotice");
const incomeStatsElement = document.getElementById("incomeStats");
const emptyIncomeNotice = document.getElementById("emptyIncomeNotice");
const segmentedProgress = document.getElementById("segmentedProgress");
const categoryLegends = document.getElementById("categoryLegends");
const txCountBadge = document.getElementById("txCountBadge");
const searchInput = document.getElementById("searchInput");
const currentMonthLabel = document.getElementById("currentMonthLabel");
const allMonthsBtn = document.getElementById("allMonthsBtn");
const toggleMaskBtn = document.getElementById("toggleMaskBtn");
const settingsModal = document.getElementById("settingsModal");

// Raqamlarni vergul bilan formatlash (masalan: "3,000,000 so'm")
function formatCurrency(amount) {
  const rounded = Math.round(Number(amount) || 0);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " so'm";
}

// Raqamlarni matn sifatida vergul bilan formatlash (masalan: "3,000,000")
function formatNumberWithCommas(val) {
  if (val === "" || val === null || val === undefined) return "";
  const clean = val.toString().replace(/\D/g, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Inputga yozayotganda avtomatik vergul qo'yish (jonli mask)
function setupCommasInputMask(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    const cursor = input.selectionStart;
    const prevLen = input.value.length;
    const formatted = formatNumberWithCommas(input.value);
    input.value = formatted;
    const newLen = formatted.length;
    const newCursor = Math.max(0, cursor + (newLen - prevLen));
    input.setSelectionRange(newCursor, newCursor);
  });
}

// Xatolik xabarini ko'rsatish
function showError(text) {
  errorMessage.textContent = text;
  errorMessage.style.display = "block";
}

// Xatolik xabarini yashirish
function hideError() {
  errorMessage.textContent = "";
  errorMessage.style.display = "none";
}

// Ma'lumotlarni localStorage'da saqlash
function saveData() {
  localStorage.setItem("expenses", JSON.stringify(expenses));
  localStorage.setItem("monthlyBudgets", JSON.stringify(monthlyBudgets));
}

// Ma'lumotlarni localStorage'dan yuklash
function loadData() {
  const storedData = localStorage.getItem("expenses");
  const storedBudgets = localStorage.getItem("monthlyBudgets");

  if (storedBudgets) {
    try {
      monthlyBudgets = JSON.parse(storedBudgets) || { default: 5000000 };
    } catch (e) {
      monthlyBudgets = { default: 5000000 };
    }
  }

  if (storedData === null) {
    expenses = [...initialSampleData];
    saveData();
  } else {
    try {
      const parsed = JSON.parse(storedData) || [];
      // Eski ma'lumotlarni yangi formatga moslash (orqaga moslik)
      expenses = parsed.map((item) => ({
        id: item.id || Date.now() + Math.random(),
        title: item.title,
        amount: Number(item.amount) || 0,
        category: item.category || "Boshqa",
        type: item.type || "expense",
        date: item.date || new Date().toISOString().slice(0, 10)
      }));
    } catch (e) {
      expenses = [];
    }
  }
}

// Tanlangan oy bo'yicha ma'lumotlarni filtrlash
function getFilteredExpensesByMonth() {
  if (isAllMonthsView) {
    return expenses;
  }
  return expenses.filter((item) => {
    if (!item.date) return false;
    return item.date.startsWith(currentMonth);
  });
}

// Jami xarajat, kirim va sof balansni hisoblash va ko'rsatish
function renderTotal() {
  const currentList = getFilteredExpensesByMonth();

  let incomeTotal = 0;
  let expenseTotal = 0;

  currentList.forEach((item) => {
    const val = Number(item.amount) || 0;
    if (item.type === "income") {
      incomeTotal += val;
    } else {
      expenseTotal += val;
    }
  });

  const netBalance = incomeTotal - expenseTotal;

  if (isBalanceMasked) {
    netBalanceAmount.textContent = "••••••• so'm";
    totalIncomeAmount.textContent = "••••••• so'm";
    totalExpenseElement.textContent = "••••••• so'm";
  } else {
    netBalanceAmount.textContent = formatCurrency(netBalance);
    totalIncomeAmount.textContent = "+" + formatCurrency(incomeTotal);
    totalExpenseElement.textContent = "-" + formatCurrency(expenseTotal);
  }

  // Oylik budjet nazoratini yangilash
  renderBudgetStatus(expenseTotal);

  return expenseTotal;
}

// Oylik budjet holatini hisoblash va progress barni yangilash
function renderBudgetStatus(expenseTotal) {
  const activeBudget = monthlyBudgets[currentMonth] || monthlyBudgets.default || 0;

  if (!activeBudget || isAllMonthsView) {
    budgetLimitText.textContent = isAllMonthsView ? "Barcha oylar ko'rinishi" : "Belgilanmagan";
    budgetProgressFill.style.width = "0%";
    budgetProgressFill.className = "budget-progress-fill";
    budgetRemainingText.textContent = "Budjet o'rnatish uchun 'Sozlash' tugmasini bosing";
    budgetPercentText.textContent = "—";
    return;
  }

  budgetLimitText.textContent = formatCurrency(activeBudget);

  const pct = Math.min(Math.round((expenseTotal / activeBudget) * 100), 100);
  const realPct = ((expenseTotal / activeBudget) * 100).toFixed(1);
  budgetProgressFill.style.width = pct + "%";
  budgetPercentText.textContent = realPct + "%";

  budgetProgressFill.className = "budget-progress-fill";
  if (expenseTotal > activeBudget) {
    budgetProgressFill.classList.add("danger");
    const over = expenseTotal - activeBudget;
    budgetRemainingText.innerHTML = `<span style="color: var(--danger-red); font-weight: 700;">Diqqat! Budjetdan ${formatCurrency(over)} oshib ketdi</span>`;
  } else if (expenseTotal >= activeBudget * 0.8) {
    budgetProgressFill.classList.add("warning");
    const left = activeBudget - expenseTotal;
    budgetRemainingText.textContent = `${formatCurrency(left)} qoldi (limitga yaqin)`;
  } else {
    const left = activeBudget - expenseTotal;
    budgetRemainingText.textContent = `${formatCurrency(left)} qoldi (me'yorda)`;
  }
}

// Moneed uslubidagi ko'p segmentli progress chiziq va afsonani chiqarish
function renderSegmentedBar() {
  if (!segmentedProgress || !categoryLegends) return;

  segmentedProgress.innerHTML = "";
  categoryLegends.innerHTML = "";

  const currentList = getFilteredExpensesByMonth().filter((i) => i.type === "expense");
  const total = currentList.reduce((sum, item) => sum + Number(item.amount), 0);

  if (currentList.length === 0 || total === 0) {
    segmentedProgress.innerHTML = `<div class="segment-slice" style="width: 100%; background-color: #e2e8f0;"></div>`;
    categoryLegends.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">Ushbu davrda xarajatlar yo'q</span>`;
    return;
  }

  const categoryTotals = {};
  currentList.forEach((item) => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + Number(item.amount);
  });

  const activeCategories = Object.keys(categoryTotals).filter((cat) => categoryTotals[cat] > 0);
  activeCategories.sort((a, b) => categoryTotals[b] - categoryTotals[a]);

  activeCategories.forEach((cat) => {
    const amount = categoryTotals[cat];
    const pct = ((amount / total) * 100).toFixed(1);
    const color = categoryColors[cat] || "#64748b";

    const slice = document.createElement("div");
    slice.className = "segment-slice";
    slice.style.width = pct + "%";
    slice.style.backgroundColor = color;
    slice.title = `${cat}: ${pct}%`;
    segmentedProgress.appendChild(slice);

    const legend = document.createElement("div");
    legend.className = "legend-item";
    legend.innerHTML = `
      <span class="legend-dot" style="background-color: ${color};"></span>
      <span>${cat}</span>
      <span class="legend-pct">${pct}%</span>
    `;
    categoryLegends.appendChild(legend);
  });
}

// Bitta amaliyot (tranzaksiya) qatorini yaratish
function createExpenseListItem(item) {
  const li = document.createElement("li");
  li.className = "expense-item";

  const isIncome = item.type === "income";
  const color = categoryColors[item.category] || (isIncome ? "#10b981" : "#64748b");
  const initial = item.category ? item.category.charAt(0) : (isIncome ? "+" : "X");
  const sign = isIncome ? "+" : "-";

  // Sana formatlash: "2026-09-25" -> "25-sentabr"
  let dateText = "";
  if (item.date) {
    const parts = item.date.split("-");
    if (parts.length === 3) {
      const monthIdx = parseInt(parts[1], 10) - 1;
      dateText = `${parseInt(parts[2], 10)}-${monthNamesUz[monthIdx] || parts[1]}`;
    }
  }

  li.innerHTML = `
    <div class="expense-left">
      <div class="cat-indicator-icon" style="background-color: ${color};">
        ${initial}
      </div>
      <div class="expense-meta">
        <span class="expense-title-text" title="${item.title}">${item.title}</span>
        <span class="expense-cat-sub">${item.category}${dateText ? " • " + dateText : ""}</span>
      </div>
    </div>
    <div class="expense-right-side">
      <span class="expense-sum ${isIncome ? 'sum-income' : 'sum-expense'}">
        ${sign}${formatCurrency(item.amount)}
      </span>
      <button type="button" class="btn-del-mini" title="O'chirish" onclick="deleteExpense(${item.id})">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    </div>
  `;
  return li;
}

// Xarajatlar va amallar ro'yxatini chiqarish
function renderList() {
  const currentList = getFilteredExpensesByMonth();

  if (txCountBadge) {
    txCountBadge.textContent = currentList.length;
  }

  // 1. So'nggi amallar (Asosiy sahifa)
  if (recentExpenseList) {
    recentExpenseList.innerHTML = "";
    if (currentList.length === 0) {
      emptyRecentNotice.style.display = "block";
    } else {
      emptyRecentNotice.style.display = "none";
      const recent = [...currentList].slice(0, 4);
      recent.forEach((item) => {
        recentExpenseList.appendChild(createExpenseListItem(item));
      });
    }
  }

  // 2. Tarix sahifasini chiqarish
  renderFilteredHistory();
}

// Tarix sahifasini filtr va qidiruv bilan yangilash
function renderFilteredHistory() {
  if (!expenseListElement) return;

  expenseListElement.innerHTML = "";

  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
  let list = getFilteredExpensesByMonth();

  // Kirim/Chiqim filtri
  if (currentHistoryFilter === "expense") {
    list = list.filter((i) => i.type === "expense");
  } else if (currentHistoryFilter === "income") {
    list = list.filter((i) => i.type === "income");
  }

  // Qidiruv filtri
  const filtered = list.filter((item) =>
    item.title.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    emptyListNotice.style.display = "block";
    emptyListNotice.textContent = list.length === 0 ? "Ushbu davrda amallar yo'q" : "Mos yozuv topilmadi";
    return;
  }

  emptyListNotice.style.display = "none";
  filtered.forEach((item) => {
    expenseListElement.appendChild(createExpenseListItem(item));
  });
}

// Kategoriyalar hisoboti (Chiqimlar va Kirimlar)
function renderCategories() {
  const currentList = getFilteredExpensesByMonth();

  // 1. Chiqimlar (Xarajatlar) hisoboti
  renderCategoryBreakdown(
    currentList.filter((i) => i.type === "expense"),
    categoryStatsElement,
    emptyCategoryNotice
  );

  // 2. Kirimlar hisoboti
  if (incomeStatsElement && emptyIncomeNotice) {
    renderCategoryBreakdown(
      currentList.filter((i) => i.type === "income"),
      incomeStatsElement,
      emptyIncomeNotice
    );
  }

  renderSegmentedBar();
}

function renderCategoryBreakdown(list, container, emptyNotice) {
  if (!container) return;
  container.innerHTML = "";

  const total = list.reduce((sum, item) => sum + Number(item.amount), 0);

  if (list.length === 0 || total === 0) {
    if (emptyNotice) emptyNotice.style.display = "block";
    return;
  }

  if (emptyNotice) emptyNotice.style.display = "none";

  const totals = {};
  list.forEach((item) => {
    totals[item.category] = (totals[item.category] || 0) + Number(item.amount);
  });

  const activeCats = Object.keys(totals).filter((cat) => totals[cat] > 0);
  activeCats.sort((a, b) => totals[b] - totals[a]);

  activeCats.forEach((cat) => {
    const amount = totals[cat];
    const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : "0";
    const color = categoryColors[cat] || "#64748b";

    const statItem = document.createElement("div");
    statItem.className = "category-stat-item";

    statItem.innerHTML = `
      <div class="stat-header-row">
        <div class="stat-left-info">
          <span class="stat-category-dot" style="background-color: ${color};"></span>
          <span class="stat-category-name">${cat}</span>
        </div>
        <div class="stat-right-info">
          <span class="stat-amount-value">${formatCurrency(amount)}</span>
          <span class="stat-pct-badge">${percentage}%</span>
        </div>
      </div>
      <div class="progress-track">
        <div class="progress-fill-bar" style="width: ${percentage}%; background-color: ${color};"></div>
      </div>
    `;

    container.appendChild(statItem);
  });
}

// Yangi amal qo'shish funksiyasi
function addExpense(e) {
  if (e) e.preventDefault();

  const title = titleInput.value.trim();
  const rawAmount = amountInput.value.replace(/,/g, "").trim();
  const amount = Number(rawAmount);
  const category = categorySelect.value;
  const type = transactionTypeInput.value || "expense";
  const dateVal = dateInput.value || new Date().toISOString().slice(0, 10);

  // Validatsiya
  if (!rawAmount || isNaN(amount) || amount <= 0) {
    showError("Iltimos, to'g'ri musbat summa kiriting.");
    amountInput.focus();
    return;
  }

  if (!title) {
    showError("Iltimos, nomini yoki izoh kiriting.");
    titleInput.focus();
    return;
  }

  hideError();

  const newExpense = {
    id: Date.now(),
    title: title,
    amount: amount,
    category: category,
    type: type,
    date: dateVal
  };

  expenses.unshift(newExpense);

  // Agar yangi qo'shilgan oy joriy ko'rinishdan boshqa bo'lsa, o'sha oyga o'tkazish
  const itemMonth = dateVal.slice(0, 7);
  if (isAllMonthsView) {
    // barcha oylar rejimida qoladi
  } else if (itemMonth !== currentMonth) {
    currentMonth = itemMonth;
    updateMonthDisplay();
  }

  saveData();
  renderTotal();
  renderList();
  renderCategories();

  // Formani tozalash
  titleInput.value = "";
  amountInput.value = "";
  setDefaultDate();

  // Tarix sahifasiga o'tkazish
  switchTab("history");
}

// Xarajat yoki kirimni o'chirish
function deleteExpense(id) {
  if (!confirm("Haqiqatan ham ushbu yozuvni o'chirmoqchimisiz?")) {
    return;
  }
  expenses = expenses.filter((item) => item.id !== id);

  saveData();
  renderTotal();
  renderList();
  renderCategories();
}

// Kirim / Chiqim rejimini almashtirish
function setTransactionType(type) {
  transactionTypeInput.value = type;

  const btnExpense = document.getElementById("typeBtnExpense");
  const btnIncome = document.getElementById("typeBtnIncome");

  if (type === "income") {
    btnIncome.classList.add("active");
    btnExpense.classList.remove("active");
    submitBtnText.textContent = "Kirimni qo'shish";
    addBtn.classList.add("income-submit");
    renderCategoryChips(incomeCategories);
  } else {
    btnExpense.classList.add("active");
    btnIncome.classList.remove("active");
    submitBtnText.textContent = "Xarajatni qo'shish";
    addBtn.classList.remove("income-submit");
    renderCategoryChips(expenseCategories);
  }
}

// Kategoriya chiplarini generatsiya qilish
function renderCategoryChips(catList) {
  categoryChips.innerHTML = "";
  categorySelect.innerHTML = "";

  catList.forEach((cat, idx) => {
    // Select option
    const opt = document.createElement("option");
    opt.value = cat.name;
    opt.textContent = cat.name;
    if (idx === 0) opt.selected = true;
    categorySelect.appendChild(opt);

    // Chip button
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-item" + (idx === 0 ? " active" : "");
    btn.setAttribute("data-category", cat.name);
    btn.textContent = cat.name;
    btn.onclick = () => {
      document.querySelectorAll(".chip-item").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      categorySelect.value = cat.name;
    };
    categoryChips.appendChild(btn);
  });
}

// Tezkor qo'shish tugmalari uchun (Dashboard dan to'g'ri rejimda ochish)
function openAddTransaction(type) {
  setTransactionType(type);
  switchTab("add");
}

// Tarix filtrini o'rnatish
function setHistoryFilter(filter) {
  currentHistoryFilter = filter;
  document.querySelectorAll(".filter-pill").forEach((btn) => {
    if (btn.getAttribute("data-filter") === filter) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  renderFilteredHistory();
}

// Oylarni ko'rsatish va yangilash
function updateMonthDisplay() {
  if (isAllMonthsView) {
    currentMonthLabel.textContent = "Barcha davrlar";
    allMonthsBtn.classList.add("active");
  } else {
    const parts = currentMonth.split("-");
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    currentMonthLabel.textContent = `${monthNamesUz[monthIdx]}, ${year}`;
    allMonthsBtn.classList.remove("active");
  }

  renderTotal();
  renderList();
  renderCategories();
}

// Oldingi oyga o'tish
function prevMonth() {
  isAllMonthsView = false;
  const parts = currentMonth.split("-");
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1; // 1-indexed -> 0-indexed prev

  if (month < 1) {
    month = 12;
    year -= 1;
  }
  currentMonth = `${year}-${String(month).padStart(2, "0")}`;
  updateMonthDisplay();
}

// Keyingi oyga o'tish
function nextMonth() {
  isAllMonthsView = false;
  const parts = currentMonth.split("-");
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) + 1;

  if (month > 12) {
    month = 1;
    year += 1;
  }
  currentMonth = `${year}-${String(month).padStart(2, "0")}`;
  updateMonthDisplay();
}

// Barcha oylarni ko'rsatish rejimini yoqish/o'chirish
function toggleAllMonths() {
  isAllMonthsView = !isAllMonthsView;
  updateMonthDisplay();
}

// Sahifalar (Tablar) orasida almashish
function switchTab(tabId) {
  const pages = document.querySelectorAll(".tab-page");
  pages.forEach((page) => page.classList.remove("active"));

  const targetPage = document.getElementById("tab-" + tabId);
  if (targetPage) {
    targetPage.classList.add("active");
  }

  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach((btn) => {
    if (btn.getAttribute("data-tab") === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  if (tabId === "add") {
    setTimeout(() => amountInput.focus(), 150);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Standart sanani belgilash (Bugungi sana)
function setDefaultDate() {
  if (dateInput) {
    const today = new Date().toISOString().slice(0, 10);
    dateInput.value = today;
  }
}

// Budjet sozlamalari modalini ochish va yopish
function openBudgetModal() {
  const activeBudget = monthlyBudgets[currentMonth] || monthlyBudgets.default || "";
  monthlyBudgetInput.value = activeBudget ? formatNumberWithCommas(activeBudget) : "";
  settingsModal.classList.add("open");
}

function closeSettingsModal() {
  settingsModal.classList.remove("open");
}

// Budjetni 100,000 yoki boshqa qadam bilan oshirish yoki kamaytirish
function adjustBudget(delta) {
  const currentVal = Number(monthlyBudgetInput.value.replace(/,/g, "")) || 0;
  const newVal = Math.max(0, currentVal + delta);
  monthlyBudgetInput.value = formatNumberWithCommas(newVal);
}

function saveMonthlyBudget() {
  const rawVal = monthlyBudgetInput.value.replace(/,/g, "").trim();
  const val = Number(rawVal);
  if (val > 0) {
    monthlyBudgets[currentMonth] = val;
    monthlyBudgets.default = val;
    saveData();
    renderTotal();
    closeSettingsModal();
    alert("Oylik budjet muvaffaqiyatli saqlandi!");
  } else {
    alert("Iltimos, to'g'ri budjet summasini kiriting.");
  }
}

function clearMonthlyBudget() {
  if (confirm("Ushbu oy uchun budjetni tozalashni xohlaysizmi?")) {
    delete monthlyBudgets[currentMonth];
    saveData();
    renderTotal();
    closeSettingsModal();
  }
}

// Zaxira nusxasini fayl qilib eksport qilish
function exportDataBackup() {
  const backupObject = {
    appName: "Moneed-Oila-Hisobi",
    exportDate: new Date().toISOString(),
    expenses: expenses,
    monthlyBudgets: monthlyBudgets
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObject, null, 2));
  const downloadAnchor = document.createElement("a");
  const fileName = `oila_hisobi_zaxira_${new Date().toISOString().slice(0, 10)}.json`;

  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", fileName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Zaxira fayldan ma'lumotlarni qayta tiklash (Import)
function importDataBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data && Array.isArray(data.expenses)) {
        if (confirm("Zaxira nusxadagi barcha ma'lumotlar tiklansinmi?")) {
          expenses = data.expenses;
          if (data.monthlyBudgets) {
            monthlyBudgets = data.monthlyBudgets;
          }
          saveData();
          renderTotal();
          renderList();
          renderCategories();
          closeSettingsModal();
          alert("Ma'lumotlar muvaffaqiyatli qayta tiklandi!");
        }
      } else {
        alert("Fayl formati noto'g'ri.");
      }
    } catch (err) {
      alert("Faylni o'qishda xatolik yuz berdi.");
    }
  };
  reader.readAsText(file);
}

// Hodisalarni tinglash
document.getElementById("prevMonthBtn").addEventListener("click", prevMonth);
document.getElementById("nextMonthBtn").addEventListener("click", nextMonth);
allMonthsBtn.addEventListener("click", toggleAllMonths);
document.getElementById("openSettingsBtn").addEventListener("click", openBudgetModal);

if (toggleMaskBtn) {
  toggleMaskBtn.addEventListener("click", () => {
    isBalanceMasked = !isBalanceMasked;
    renderTotal();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", renderFilteredHistory);
}

expenseForm.addEventListener("submit", addExpense);

// Ilova ishga tushishi
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setDefaultDate();
  setTransactionType("expense");
  setupCommasInputMask(amountInput);
  setupCommasInputMask(monthlyBudgetInput);
  updateMonthDisplay();
});
