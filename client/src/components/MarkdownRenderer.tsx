import { Streamdown } from "streamdown";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <Streamdown>{content}</Streamdown>
    </div>
  );
}
