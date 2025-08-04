import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import { Language } from "@spoke/spoke-codegen";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const LanguageSelector: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    Language.En
  );
  const { i18n } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(selectedLanguage);
  }, [selectedLanguage]);

  const handleLangSelected = (
    event: React.ChangeEvent<{
      name?: string;
      value: unknown;
    }>
  ) => setSelectedLanguage(event.target.value as Language);

  return (
    <>
      <InputLabel id="select-lang">Language</InputLabel>
      <Select
        value={selectedLanguage}
        onChange={handleLangSelected}
        labelId="select-lang"
        style={{ marginTop: 10 }}
      >
        <MenuItem value={Language.En}>English</MenuItem>
        <MenuItem value={Language.Es}>Español</MenuItem>
      </Select>
    </>
  );
};

export default LanguageSelector;
