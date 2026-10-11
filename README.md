# TaskFlow

TaskFlow ek responsive todo app hai jisme aap apne roz ke tasks ko organize, track aur complete kar sakte hain. App HTML, CSS aur vanilla JavaScript se bana hai. Isme backend ki zaroorat nahi hai; tasks aur theme aapke browser ke `localStorage` mein save hote hain.

## App ko locally kaise chalayein

### Python ke saath

1. Terminal mein project folder kholein:

   ```powershell
   cd C:\Users\lc\Desktop\Todo
   ```

2. Local web server start karein:

   ```powershell
   python -m http.server 8002
   ```

3. Browser mein [http://localhost:8002](http://localhost:8002) kholein.

Server band karne ke liye terminal mein `Ctrl+C` dabayein.

### VS Code Live Server ke saath

VS Code mein `index.html` kholein, phir **Go Live** par click karein. Live Server extension installed na ho to Python wala tareeqa use karein.

## Features

- Task add karna; title zaroori hai, description optional hai.
- Task edit karke changes save ya cancel karna.
- Task ko complete ya incomplete mark karna.
- Task delete karne aur completed tasks clear karne se pehle confirmation.
- Due date, priority (High, Medium, Low), aur category (Personal, Work, Study, Other).
- My Day, Upcoming, All Tasks, aur Completed views.
- All, Active, aur Completed filters; title search; category/priority filters; sorting.
- Total, pending, completed, aur overdue counts ke saath completion progress.
- Light/dark theme toggle.
- Responsive layout for mobile, tablet, and desktop.
- Toast messages aur helpful empty states.
- Tasks aur selected theme browser refresh ke baad bhi saved rehte hain.

## Project files

- `index.html` — app ka structure
- `style.css` — layout, themes, aur responsive styling
- `script.js` — tasks, filters, LocalStorage, aur interactions
- `README.md` — project aur run karne ki jankari

## Data kahan save hota hai?

TaskFlow data ko usi browser aur device ke `localStorage` mein rakhta hai. Isliye app ko usi browser/origin par kholne se saved tasks milenge. Browser ka site data clear karne par saved tasks aur theme preference mit sakte hain. App kisi server par data upload nahi karta.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Browser LocalStorage
