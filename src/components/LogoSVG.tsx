interface LogoSVGProps {
  size?: number;
  className?: string;
}

const LogoSVG = ({ size = 40, className = "" }: LogoSVGProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        filter: 'drop-shadow(0 0 8px hsla(158, 64%, 52%, 0.2))',
        transition: 'filter 0.3s ease'
      }}
    >
      <defs>
        {/* Gradiente do escudo */}
        <linearGradient id="shieldGradient" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#1a4d2e" />
          <stop offset="100%" stopColor="#0f2818" />
        </linearGradient>
        
        {/* Gradiente da estrada */}
        <linearGradient id="roadGradient" x1="30%" y1="30%" x2="70%" y2="70%">
          <stop offset="0%" stopColor="hsl(158, 64%, 62%)" />
          <stop offset="100%" stopColor="hsl(158, 64%, 52%)" />
        </linearGradient>
      </defs>
      
      {/* Escudo base */}
      <path
        d="M50 10 C65 10, 75 15, 80 20 L80 45 C80 65, 70 80, 50 90 C30 80, 20 65, 20 45 L20 20 C25 15, 35 10, 50 10 Z"
        fill="url(#shieldGradient)"
      />
      
      {/* Checkmark/Estrada (parte esquerda - mais grossa) */}
      <path
        d="M35 50 L42 60 L45 57"
        stroke="url(#roadGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Estrada (parte direita - curva para cima) */}
      <path
        d="M45 57 Q55 45, 70 35"
        stroke="url(#roadGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Linha divisória branca da estrada */}
      <path
        d="M42 58 Q52 46, 67 37"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 3"
        opacity="0.9"
        fill="none"
      />
    </svg>
  );
};

export default LogoSVG;
