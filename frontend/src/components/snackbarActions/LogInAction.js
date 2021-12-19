import { Button, IconButton } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";
import React, {useContext, useEffect, useState} from "react";
import { redirect } from "../../../public/lib/apiOperations";
import getTexts from "../../../public/texts/texts_optimized";
import UserContext from "../context/UserContext";

const useStyles = makeStyles(() => ({
  signUpButton: {
    background: "white",
  },
}));

export default function LogInAction({ onClose }) {
  const classes = useStyles();
  const { locale } = useContext(UserContext);
  const [texts, setTexts] = useState({});

  useEffect(async () => {
    if (locale) {
      setTexts(await getTexts({page: "general", locale: locale}));
    }
  },[locale]);

  const onClickSignUp = () => {
    let redirectUrl = window.location.href
      .replace(window.location.origin, "")
      .replace(`/${locale}/`, "");
    if (redirectUrl[0] === "/") {
      redirectUrl = redirectUrl.slice(1, redirectUrl.length);
    }
    redirect("/signin", { redirect: redirectUrl });
  };

  return (
    <>
      <Button className={classes.signUpButton} variant="contained" onClick={onClickSignUp}>
        {texts.log_in}
      </Button>
      <IconButton aria-label="close" color="inherit" onClick={onClose}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </>
  );
}
