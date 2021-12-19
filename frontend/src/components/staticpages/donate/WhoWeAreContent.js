import { makeStyles } from "@material-ui/core/styles";
import React, {useContext, useEffect, useState} from "react";
import getTexts from "../../../../public/texts/texts_optimized";
import UserContext from "../../context/UserContext";

const useStyles = makeStyles((theme) => ({
  teamRoot: {
    display: "flex",
    alignItems: "center",
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  image: {
    width: "100%",
  },
  infoLinkBox: {
    flexDirection: "column",
    marginLeft: 0,
    marginRight: theme.spacing(5),
    flexBasis: 400,
    textAlign: "center",
  },
}));

export default function WhoWeAreContent() {
  const classes = useStyles();
  const { locale } = useContext(UserContext);
  const [texts, setTexts] = useState({});

  useEffect(async () => {
    if (locale) {
      setTexts(await getTexts({ page: "donate", locale: locale, classes: classes}));
    }
  },[locale, classes]);

  return (
    <div className={classes.teamRoot}>
      <div className={classes.imageContainer}>
        <div className={classes.imageWrapper}>
          <img
            src="/images/team.jpg"
            alt={texts.our_team_image_text}
            className={classes.image}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
