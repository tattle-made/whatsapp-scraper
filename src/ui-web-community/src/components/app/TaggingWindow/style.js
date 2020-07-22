import styled from 'styled-components';

const Container = styled.div`
  background: #f5eee5;
  padding: 2%;
  font-size: 0.8em;
  width: 90%;
  margin: 0 auto;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  @media (min-width: 700px) {
    padding: 2% 10%;
    position: -webkit-sticky; /* Safari */
    position: sticky;
  }
`;

export { Container };
