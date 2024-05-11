import React from "react";

export interface LinkInNewTabProps {
  text: string;
  link: string;
}

export const LinkInNewTab: React.FC<LinkInNewTabProps> = ({ text, link }) => (
  <a href={link} target="_blank" rel="noopener noreferrer">
    {text}
  </a>
);
