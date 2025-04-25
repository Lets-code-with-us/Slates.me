
interface ResizeHandleProps {
  onResizeStart: (e: React.MouseEvent) => void;
  onResize: (e: React.MouseEvent) => void;
  onResizeEnd: () => void;
}

export const ResizeHandle = ({ onResizeStart, onResize, onResizeEnd }: ResizeHandleProps) => {
  return (
    <div
      className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize"
      onMouseDown={onResizeStart}
      onMouseMove={onResize}
      onMouseUp={onResizeEnd}
      onMouseLeave={onResizeEnd}
      style={{
        background: 'linear-gradient(135deg, transparent 50%, rgb(209, 213, 219) 50%)',
      }}
    />
  );
};
