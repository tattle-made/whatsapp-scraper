import React from "react"
import PropTypes from "prop-types"
import TagsInput from "react-tagsinput"

import * as S from "./style"
import "react-tagsinput/react-tagsinput.css"

const TaggingWindow = ({ taggingVisible, tags, changeTags }) => {
  return taggingVisible ? (
    <S.Container>
      <TagsInput value={tags} onChange={e => changeTags(e)} />
      <p>Type a tag name and press enter</p>
    </S.Container>
  ) : null
}

TaggingWindow.propTypes = {
  taggingVisible: PropTypes.bool.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string).isRequired,
  changeTags: PropTypes.func.isRequired,
}

TaggingWindow.defaultProps = {}

export default TaggingWindow
