import { MjmlColumn, MjmlSection, MjmlText } from "@faire/mjml-react";
import React from "react";

interface FooterProps {
  orgName: string;
  settingsUrl: string;
}

const Footer: React.FC<FooterProps> = ({ orgName, settingsUrl }) => {
  return (
    <MjmlSection fullWidth>
      <MjmlColumn>
        <MjmlText>
          <p>© 2024 With The Ranks, LLC. All rights reserved.</p>
          <p>
            You are receiving this email because you signed up to text for{" "}
            {orgName}
            .
            <br />
            <a href={settingsUrl}>Update</a> your preferences or unsubscribe{" "}
            <a href={settingsUrl}>here</a>
            .
            <br />
          </p>
          <p>
            With The Ranks LLC <br />
            PO Box 49151 <br />
            Cookeville, TN 38501 <br />
          </p>
        </MjmlText>
      </MjmlColumn>
    </MjmlSection>
  );
};
export default Footer;
