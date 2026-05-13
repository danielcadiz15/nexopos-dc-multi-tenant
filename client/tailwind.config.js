// Configuración de Tailwind CSS para la aplicación React

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.06)',
        elevated: '0 10px 40px -12px rgba(79, 70, 229, 0.18), 0 4px 16px -8px rgba(15, 23, 42, 0.12)',
      },
      backgroundImage: {
        'nexo-mesh':
          'radial-gradient(at 0% 0%, rgba(139, 92, 246, 0.12) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(14, 165, 233, 0.1) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.08) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
}
