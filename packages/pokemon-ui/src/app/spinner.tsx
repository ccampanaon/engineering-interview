import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const SpinnerElement = styled.div`
  width: 28px;
  height: 28px;
  border: 3px solid #dcdfe6;
  border-top-color: #4f6df5;
  border-radius: 50%;
  animation: ${spin} 700ms linear infinite;
`;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #555;
  padding: 12px 0;
`;

export function Spinner({ label }: { label: string }) {
  return (
    <Wrapper>
      <SpinnerElement />
      <span>{label}</span>
    </Wrapper>
  );
}
