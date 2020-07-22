import React from 'react';
import PropTypes from 'prop-types';
import TagsInput from 'react-tagsinput';

import * as S from './style';
import 'react-tagsinput/react-tagsinput.css';

const TaggingWindow = ({ taggingVisible, tags, addTags }) => {
  return taggingVisible ? (
    <S.Container>
      <TagsInput value={tags} onChange={e => addTags(e)} />
      <p>Type a tag name and press enter</p>
    </S.Container>
  ) : null;
};

TaggingWindow.propTypes = {
  taggingVisible: PropTypes.bool.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string).isRequired,
  addTags: PropTypes.func.isRequired,
};

TaggingWindow.defaultProps = {};

export default TaggingWindow;
