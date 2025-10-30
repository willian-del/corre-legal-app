import logoImage from "@/assets/logo.png";

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo = ({ size = 40, className = "" }: LogoProps) => {
  return (
    <img 
      src={logoImage} 
      alt="Corre Legal" 
      width={size} 
      height={size}
      decoding="async"
      loading="eager"
      className={className}
      style={{ 
        filter: 'drop-shadow(0 0 8px hsla(158, 64%, 52%, 0.15))',
        display: 'inline-block'
      }}
    />
  );
};

export default Logo;
