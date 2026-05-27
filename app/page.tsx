// El middleware maneja la redirección de esta ruta automáticamente.
// Esta página solo se renderiza si el middleware falla (fallback de seguridad).
export default function Home() {
  return (
    <div className="bg-surface flex h-screen items-center justify-center">
      <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}
