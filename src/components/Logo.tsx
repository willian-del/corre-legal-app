import LogoSVG from "./LogoSVG";

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo = ({ size = 40, className = "" }: LogoProps) => {
  return <LogoSVG size={size} className={className} />;
};

export default Logo;
