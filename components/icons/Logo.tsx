import Image from 'next/image';

const Logo = ({ ...props }) => (
  <Image
    src="/logo.svg"
    alt="Snow Recovery"
    width={86}
    height={86}
    {...props}
  />
);

export default Logo;
