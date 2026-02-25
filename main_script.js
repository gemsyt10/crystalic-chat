// ================= DOM =================
const input = document.querySelector(".mess-input");
const sendBtn = document.querySelector(".send-mess");
const chat = document.querySelector(".mess-cont");
const userNameEl = document.querySelector(".user-name");
const statusEl = document.querySelector(".user-status");

// ================= MockAPI =================
const API = "https://6996ed1d7d1786436575c411.mockapi.io/ServerAPI/Messenger";

// ================= CURRENT USER =================
let currentUser = localStorage.getItem("username");
let currentUserId = localStorage.getItem("userId");
let privateChatWith = null;

// ================= UI =================
function addMessage(text, isSystem = false) {
  const div = document.createElement("div");
  div.className = isSystem ? "message system" : "message";
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// ================= РОБОТА З API =================
async function getUsers() {
  try {
    const res = await fetch(API);
    return await res.json();
  } catch {
    return [];
  }
}

async function updateUser(id, data) {
  try {
    await fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.log("Помилка оновлення:", e);
  }
}

async function createUser(name) {
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        username: name,
        online: true,
        text: [],
        type: "user",
        timestamp: Date.now().toString()
      })
    });
    return await res.json();
  } catch {
    return null;
  }
}

// ================= СТАРТ =================
window.addEventListener("load", async () => {
  if (currentUser && currentUserId) {
    const users = await getUsers();
    const exists = users.find(u => u.id === currentUserId);
    
    if (exists) {
      userNameEl.textContent = currentUser;
      statusEl.textContent = "online";
      await updateUser(currentUserId, { online: true });
    } else {
      localStorage.removeItem("username");
      localStorage.removeItem("userId");
      currentUser = null;
      currentUserId = null;
    }
  }
  
  addMessage("🚀 Чат запущено. /help - команди", true);
  setInterval(checkMessages, 2000);
});

// ================= ВІДПРАВКА =================
sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  // КОМАНДИ
  if (text.startsWith("/")) {
    const parts = text.split(" ");
    const cmd = parts[0].toLowerCase();
    
    if (cmd === "/help") {
      addMessage("📋 КОМАНДИ:", true);
      addMessage("/setusername @name - вхід/реєстрація", true);
      addMessage("/users - список юзерів", true);
      addMessage("/msg @username - почати особистий чат", true);
      addMessage("/back - повернутись в загальний чат", true);
      addMessage("/me - мій профіль", true);
      addMessage("/clear - очистити чат", true);
    }
    
    else if (cmd === "/setusername") {
      const name = parts[1];
      if (!name || !name.startsWith("@")) {
        addMessage("❌ Формат: /setusername @name", true);
        input.value = "";
        return;
      }
      
      const users = await getUsers();
      const existingUser = users.find(u => u.username === name);
      
      if (existingUser) {
        currentUserId = existingUser.id;
        currentUser = name;
        await updateUser(currentUserId, { online: true });
        addMessage(`✅ Вітаємо, ${name}!`, true);
      } else {
        const newUser = await createUser(name);
        if (newUser) {
          currentUserId = newUser.id;
          currentUser = name;
          addMessage(`✅ Створено ${name}`, true);
        } else {
          addMessage("❌ Помилка", true);
          input.value = "";
          return;
        }
      }
      
      localStorage.setItem("username", currentUser);
      localStorage.setItem("userId", currentUserId);
      userNameEl.textContent = currentUser;
      statusEl.textContent = "online";
      privateChatWith = null;
    }
    
    else if (cmd === "/users") {
      const users = await getUsers();
      addMessage(`📋 Юзери (${users.length}):`, true);
      users.forEach(u => {
        const status = u.online ? "🟢" : "🔴";
        const priv = privateChatWith === u.username ? " 📨" : "";
        addMessage(`${status} ${u.username}${priv}`, true);
      });
    }
    
    else if (cmd === "/msg") {
      const target = parts[1];
      if (!target || !target.startsWith("@")) {
        addMessage("❌ Формат: /msg @username", true);
        input.value = "";
        return;
      }
      
      const users = await getUsers();
      const exists = users.find(u => u.username === target);
      
      if (!exists) {
        addMessage(`❌ Юзера ${target} не існує`, true);
        input.value = "";
        return;
      }
      
      if (target === currentUser) {
        addMessage("❌ Не можна писати собі", true);
        input.value = "";
        return;
      }
      
      privateChatWith = target;
      addMessage(`💬 Особистий чат з ${target}`, true);
    }
    
    else if (cmd === "/back") {
      privateChatWith = null;
      addMessage("🌐 Загальний чат", true);
    }
    
    else if (cmd === "/me") {
      if (currentUser) {
        addMessage(`👤 ${currentUser} (ID: ${currentUserId})`, true);
        if (privateChatWith) {
          addMessage(`📨 Особистий чат з: ${privateChatWith}`, true);
        }
      } else {
        addMessage("❌ Немає юзера", true);
      }
    }
    
    else if (cmd === "/clear") {
      chat.innerHTML = "";
    }
    
    else {
      addMessage("❌ Невідома команда. /help", true);
    }
    
    input.value = "";
    return;
  }

  // ЗВИЧАЙНЕ ПОВІДОМЛЕННЯ
  if (!currentUser) {
    addMessage("❌ Спочатку /setusername @name", true);
    input.value = "";
    return;
  }

  try {
    const users = await getUsers();
    
    if (privateChatWith) {
      // ========== ОСОБИСТЕ ПОВІДОМЛЕННЯ ==========
      const targetUser = users.find(u => u.username === privateChatWith);
      
      if (!targetUser) {
        addMessage("❌ Користувача не знайдено", true);
        privateChatWith = null;
        input.value = "";
        return;
      }
      
      // Відправляємо повідомлення ТІЛЬКИ цьому користувачу
      const targetText = targetUser.text || [];
      targetText.push({
        form: currentUser,
        message: text,
        type: "private",
        seen: false
      });
      
      await updateUser(targetUser.id, { text: targetText });
      
      // Показуємо собі, що відправили
      addMessage(`✉️ [до ${privateChatWith}]: ${text}`);
      
    } else {
      // ========== ЗАГАЛЬНИЙ ЧАТ ==========
      // Відправляємо всім КРІМ СЕБЕ
      for (let user of users) {
        if (user.id !== currentUserId) {
          const userText = user.text || [];
          userText.push({
            form: currentUser,
            message: text,
            type: "global",
            seen: false
          });
          
          await updateUser(user.id, { text: userText });
        }
      }
      
      // Показуємо собі
      addMessage(`${currentUser}: ${text}`);
    }
    
  } catch (e) {
    console.log(e);
    addMessage("❌ Помилка відправки", true);
  }
  
  input.value = "";
}

// ================= ПЕРЕВІРКА НОВИХ ПОВІДОМЛЕНЬ =================
async function checkMessages() {
  if (!currentUserId) return;
  
  try {
    const res = await fetch(`${API}/${currentUserId}`);
    const me = await res.json();
    
    const messages = me.text || [];
    let updated = false;
    
    for (let msg of messages) {
      if (!msg.seen) {
        // Якщо це особисте повідомлення
        if (msg.type === "private") {
          addMessage(`📨 ${msg.form} (особисте): ${msg.message}`);
        } 
        // Якщо це повідомлення в загальний чат
        else if (msg.type === "global") {
          // Не показуємо свої власні повідомлення з загального чату
          if (msg.form !== currentUser) {
            addMessage(`${msg.form}: ${msg.message}`);
          }
        }
        
        msg.seen = true;
        updated = true;
      }
    }
    
    if (updated) {
      await updateUser(currentUserId, { text: messages });
    }
    
  } catch (e) {
    // Ігноруємо помилки
  }
}

// ================= ВИХІД =================
window.addEventListener("beforeunload", () => {
  if (currentUserId) {
    fetch(`${API}/${currentUserId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ online: false }),
      keepalive: true
    });
  }
});