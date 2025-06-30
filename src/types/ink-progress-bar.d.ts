declare module 'ink-progress-bar' {
    interface ProgressBarProps {
      percent: number;
      columns?: number;
      character?: string;
    }
    export default function ProgressBar(props: ProgressBarProps): JSX.Element;
  }
