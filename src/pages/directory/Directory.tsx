import { MenuRow, PageHeader } from '../../components/ui'

export default function Directory() {
  return (
    <>
      <PageHeader title="Directory" />
      <section className="menu">
        <MenuRow to="/directory/neighbours" icon="unit" title="Neighbours" subtitle="Residents and their flats" />
        <MenuRow to="/directory/documents" icon="file" title="Documents" subtitle="Bye-laws, minutes, notices" />
        <MenuRow to="/directory/emergency" icon="phone" title="Emergency contacts" subtitle="Police, fire, ambulance, security" />
        <MenuRow to="/directory/vendor" icon="directory" title="Vendors" subtitle="Plumber, electrician and more" />
        <MenuRow to="/directory/committee" icon="admin" title="Management Committee" subtitle="Office bearers" />
      </section>
    </>
  )
}
