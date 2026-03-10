export default function InvoicesLoading() {
  return (
    <div
      className="flex items-center justify-center p-8"
      aria-busy="true"
    >
      <div
        className="w-8 h-8 border-2 border-border-light border-t-primary rounded-full animate-spin"
        aria-hidden
      />
    </div>
  );
}
