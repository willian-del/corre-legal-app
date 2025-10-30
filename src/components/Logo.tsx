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
      className={className}
    />
  );
};

export default Logo;
