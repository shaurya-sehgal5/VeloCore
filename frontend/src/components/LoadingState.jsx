import React from 'react';
import { MONO } from '../config';

export default function LoadingState({ message = 'loading...' }) {
  return <p style={{ color: '#52525b', fontSize: '13.5px', fontFamily: MONO }}>$ {message}</p>;
}
