import './NotebookLayout.css';

interface Props {
  children: React.ReactNode;
}

export function NotebookLayout({ children }: Props) {
  return (
    <div className="notebook-layout">
      {children}
    </div>
  );
}
