{caption && (
  <div
    style={{
      display: "grid",
      gap: 14
    }}
  >
    {caption
      .split(/\n\s*\n/)
      .filter(Boolean)
      .map((section, index) => (
        <div
          key={index}
          style={{
            background: "white",
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 18,
            padding: 18
          }}
        >
          <p
            style={{
              whiteSpace: "pre-line",
              margin: 0,
              fontSize: 14,
              lineHeight: 1.75,
              color: "#333"
            }}
          >
            {section}
          </p>
        </div>
      ))}
  </div>
)}
export default BrandThatAI;
