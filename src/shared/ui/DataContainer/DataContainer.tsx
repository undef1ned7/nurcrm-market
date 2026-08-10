import styles from './container.module.scss'


export default function DataContainer({ children, className =''}: any) {
  
  return (
    <div className={`${styles.datacontainer} ${className}`}>
      {children}
    </div>
  )
}
