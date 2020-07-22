import styled, { css } from 'styled-components';
import * as C from '../../utils/colors';

const Container = styled.div`
  background: #f5eee5;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  position: -webkit-sticky; /* Safari */
  position: sticky;
  top: 0;

  @media (min-width: 700px) {
    padding: 0 10%;
  }
`;

const Button = styled.a`
  display: inline-block;
  margin: 0.5rem 1rem;
  padding: 0.25em 0.5em;
  text-decoration: none;
  color: #fff;
  background: #fd9535; /*button color*/
  border-bottom: solid 2px #d27d00; /*daker color*/
  border-radius: 4px;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.2),
    0 2px 2px rgba(0, 0, 0, 0.19);

  ${props =>
    props.primary &&
    css`
      background: ${C.whatsappGreenColor};
      border: 2px solid ${C.whatsappGreenDarkColor};
    `}

  ${props =>
    props.secondary &&
    css`
      background: skyblue;

      border: 2px solid lightblue;
    `}
    
    &:hover {
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 1px 1px rgba(0, 0, 0, 0.19);
  }
`;

export { Container, Button };
