import React from "react"
import PropTypes from "prop-types"
import * as S from "./style"
import TaggingWindow from "../TaggingWindow/TaggingWindow"

const ContextActionBar = ({
  visible,
  linkHandler,
  deleteHandler,
  tagHandler,
  taggingVisible,
  tags,
  changeTags,
}) => {
  return visible ? (
    <S.Container>
      <S.Button onClick={linkHandler}>Link</S.Button>
      <S.Button onClick={deleteHandler}>Delete</S.Button>
      <S.Button secondary onClick={tagHandler}>
        Tags
      </S.Button>
      <TaggingWindow
        taggingVisible={taggingVisible}
        tags={tags}
        changeTags={changeTags}
      />
    </S.Container>
  ) : null
}

ContextActionBar.propTypes = {
  visible: PropTypes.bool.isRequired,
  uploadHandler: PropTypes.func.isRequired,
  linkHandler: PropTypes.func.isRequired,
  deleteHandler: PropTypes.func.isRequired,
  tagHandler: PropTypes.func.isRequired,
}

ContextActionBar.defaultProps = {}

export default ContextActionBar
